#!/usr/bin/env node
/**
 * Clip pipeline for Clip Court.
 *
 *   node --env-file=.env.local scripts/clips.mjs init    <folder>   # writes <folder>/manifest.json to fill in
 *   node --env-file=.env.local scripts/clips.mjs process <folder>   # encode, thumbnail, upload, insert rows
 *   node --env-file=.env.local scripts/clips.mjs remove  <prefix>   # delete seeded clips whose path starts with <prefix>
 *
 * Encoding: max 60s, H.264 + AAC, +faststart (instant start on phones).
 * Vertical sources -> 720x1280. Horizontal sources stay 16:9 at 720p unless the manifest says
 * "crop": true, which center-crops them to vertical.
 *
 * Set FFMPEG / FFPROBE to full paths if they aren't on PATH yet.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws"; // Node 20 has no built-in WebSocket; supabase-js needs one

const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"]);
const CATEGORIES = new Set(["trickshot", "montage", "funny", "tribute"]);
const MAX_SECONDS = 60;

const [, , command, target] = process.argv;

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die("Run with --env-file=.env.local (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).");
  return createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } });
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function titleFromFile(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80);
}

async function probe(file) {
  const { stdout } = await run(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,width,height:stream_tags=rotate:stream_side_data=rotation",
    "-of", "json",
    file,
  ]);
  const info = JSON.parse(stdout);
  const v = info.streams.find((s) => s.codec_type === "video");
  if (!v) throw new Error("no video stream");
  const rotation = Number(v.tags?.rotate ?? v.side_data_list?.find((d) => "rotation" in d)?.rotation ?? 0);
  const swap = Math.abs(rotation) % 180 === 90;
  return {
    duration: Number(info.format.duration),
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

async function init(folder) {
  if (!existsSync(folder)) die(`Folder not found: ${folder}`);
  const manifestPath = path.join(folder, "manifest.json");
  if (existsSync(manifestPath)) die(`${manifestPath} already exists. Edit it, then run "process".`);

  const files = (await readdir(folder)).filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase())).sort();
  if (!files.length) die(`No video files in ${folder}`);

  const entries = [];
  for (const file of files) {
    let note = "";
    try {
      const p = await probe(path.join(folder, file));
      note = `${p.width}x${p.height}, ${p.duration.toFixed(1)}s${p.duration > MAX_SECONDS ? " (will be trimmed to 60s)" : ""}`;
    } catch (e) {
      note = `UNREADABLE: ${e.message}`;
    }
    entries.push({
      file,
      title: titleFromFile(file),
      category: "trickshot",
      creator: "",
      crop: false,
      start: 0,
      _info: note,
    });
  }
  await writeFile(manifestPath, JSON.stringify(entries, null, 2));
  console.log(`✔ Wrote ${manifestPath} with ${entries.length} clips.`);
  console.log(`  Fill in title / category (${[...CATEGORIES].join(", ")}) / creator for each, then run "process".`);
  console.log(`  "start" trims seconds off the front; "crop": true turns a horizontal clip vertical.`);
}

async function processFolder(folder) {
  const manifestPath = path.join(folder, "manifest.json");
  if (!existsSync(manifestPath)) die(`No manifest. Run: init ${folder}`);
  const entries = JSON.parse(await readFile(manifestPath, "utf8"));
  const outDir = path.join(folder, "_out");
  await mkdir(outDir, { recursive: true });
  const db = admin();

  let ok = 0;
  for (const [i, e] of entries.entries()) {
    const label = `[${i + 1}/${entries.length}] ${e.file}`;
    try {
      if (!CATEGORIES.has(e.category)) throw new Error(`bad category "${e.category}"`);
      if (!e.title?.trim()) throw new Error("missing title");
      const src = path.join(folder, e.file);
      const p = await probe(src);
      const start = Number(e.start) || 0;
      const length = Math.min(MAX_SECONDS, Math.max(1, p.duration - start));
      const sourceVertical = p.height >= p.width;
      const vertical = sourceVertical || !!e.crop;

      const vf = sourceVertical
        ? "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
        : e.crop
          ? "crop=ih*9/16:ih,scale=720:1280,setsar=1"
          : "scale=-2:720,setsar=1";

      const hash = createHash("sha1").update(`${e.file}|${start}|${e.crop}`).digest("hex").slice(0, 8);
      const name = `${slugify(e.title)}-${hash}`;
      const outVideo = path.join(outDir, `${name}.mp4`);
      const outThumb = path.join(outDir, `${name}.jpg`);

      process.stdout.write(`${label}: encoding ${length.toFixed(1)}s ${vertical ? "vertical" : "horizontal"}… `);
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-ss", String(start), "-i", src, "-t", String(length),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-profile:v", "high", "-pix_fmt", "yuv420p",
        ...(p.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"]),
        "-movflags", "+faststart",
        outVideo,
      ]);
      await run(FFMPEG, [
        "-y", "-v", "error",
        "-ss", String(Math.min(2, length / 3)), "-i", outVideo,
        "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4",
        outThumb,
      ]);

      const videoPath = `seed/${name}.mp4`;
      const thumbPath = `seed/${name}.jpg`;
      process.stdout.write("uploading… ");
      const up1 = await db.storage.from("clips").upload(videoPath, await readFile(outVideo), {
        contentType: "video/mp4",
        upsert: true,
      });
      if (up1.error) throw up1.error;
      const up2 = await db.storage.from("thumbs").upload(thumbPath, await readFile(outThumb), {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (up2.error) throw up2.error;

      const row = {
        title: e.title.trim().slice(0, 80),
        category: e.category,
        creator_label: e.creator?.trim() || null,
        video_path: videoPath,
        thumb_path: thumbPath,
        duration_s: Math.round(length * 10) / 10,
        orientation: vertical ? "vertical" : "horizontal",
        owner_id: null,
      };
      const existing = await db.from("clips").select("id").eq("video_path", videoPath).maybeSingle();
      const res = existing.data
        ? await db.from("clips").update(row).eq("id", existing.data.id)
        : await db.from("clips").insert(row);
      if (res.error) throw res.error;

      console.log(existing.data ? "updated ✔" : "added ✔");
      ok++;
    } catch (err) {
      console.log(`\n${label}: ✖ ${err.message ?? err}`);
    }
  }
  console.log(`\nDone: ${ok}/${entries.length} clips are live in Clip Court.`);
}

async function remove(prefix) {
  if (!prefix) die("Give a path prefix, e.g. seed/test-");
  const db = admin();
  const { data: rows, error } = await db.from("clips").select("id, video_path, thumb_path").like("video_path", `${prefix}%`);
  if (error) die(error.message);
  if (!rows.length) return console.log("Nothing to remove.");
  await db.storage.from("clips").remove(rows.map((r) => r.video_path));
  await db.storage.from("thumbs").remove(rows.map((r) => r.thumb_path).filter(Boolean));
  const del = await db.from("clips").delete().in("id", rows.map((r) => r.id));
  if (del.error) die(del.error.message);
  console.log(`✔ Removed ${rows.length} clips (and their votes) with prefix ${prefix}`);
}

if (command === "init") await init(target ?? die("Usage: init <folder>"));
else if (command === "process") await processFolder(target ?? die("Usage: process <folder>"));
else if (command === "remove") await remove(target);
else die("Usage: clips.mjs init|process <folder>  or  clips.mjs remove <path-prefix>");
