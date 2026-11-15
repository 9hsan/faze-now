"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, friendlyError, type CategoryId } from "@/lib/clips";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_SECONDS = 90;
const ACCEPT = ["video/mp4", "video/webm", "video/quicktime"];

type Probe = { duration: number; width: number; height: number; thumb: Blob | null };

/** Reads duration/size in the browser and grabs a JPEG frame for the thumbnail. */
function probeVideo(file: File): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as a video."));
    };
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1.5, v.duration / 3);
    };
    v.onseeked = () => {
      const canvas = document.createElement("canvas");
      const scale = 480 / Math.max(v.videoWidth, v.videoHeight);
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: blob });
        },
        "image/jpeg",
        0.82,
      );
    };
  });
}

export function SubmitForm() {
  const { ready, user, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("trickshot");
  const [state, setState] = useState<"idle" | "uploading" | "done">("idle");
  const [progressNote, setProgressNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    setError(null);

    if (!ACCEPT.includes(file.type)) return setError("Use an MP4, WebM or MOV file.");
    if (file.size > MAX_BYTES) return setError("Max file size is 50 MB. Trim or compress the clip first.");

    setState("uploading");
    try {
      setProgressNote("Checking your clip…");
      const probe = await probeVideo(file);
      if (probe.duration > MAX_SECONDS) {
        throw new Error(`Clips can be up to ${MAX_SECONDS} seconds. Yours is ${Math.round(probe.duration)}s.`);
      }

      const supabase = getSupabase();
      const id = crypto.randomUUID();
      const ext = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
      const videoPath = `${user.id}/${id}.${ext}`;

      setProgressNote("Uploading video…");
      const up = await supabase.storage.from("clips").upload(videoPath, file, { contentType: file.type });
      if (up.error) throw up.error;

      let thumbPath: string | null = null;
      if (probe.thumb) {
        setProgressNote("Uploading thumbnail…");
        const t = await supabase.storage
          .from("thumbs")
          .upload(`${user.id}/${id}.jpg`, probe.thumb, { contentType: "image/jpeg" });
        if (!t.error) thumbPath = `${user.id}/${id}.jpg`;
      }

      setProgressNote("Entering Clip Court…");
      const ins = await supabase.from("clips").insert({
        title: title.trim(),
        category,
        video_path: videoPath,
        thumb_path: thumbPath,
        duration_s: Math.round(probe.duration * 10) / 10,
        orientation: probe.height >= probe.width ? "vertical" : "horizontal",
      });
      if (ins.error) throw ins.error;

      setState("done");
      refreshProfile();
    } catch (err) {
      setState("idle");
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
        <h2 className="display text-4xl">You&apos;re in.</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          New clips jump to the front of the line, so yours will start getting judged right away.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/court/leaderboard" className="rounded-md bg-faze px-4 py-2 font-bold text-white">
            Watch the leaderboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setState("idle");
              setFile(null);
              setTitle("");
            }}
            className="rounded-md border border-line px-4 py-2 font-bold"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  const busy = state === "uploading";

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-bold">Your clip</span>
        <input
          type="file"
          accept={ACCEPT.join(",")}
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-dashed border-line bg-surface p-4 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-faze file:px-3 file:py-1.5 file:font-bold file:text-white"
          required
        />
        <span className="text-xs text-muted">MP4, WebM or MOV · up to 90 seconds · 50 MB. Vertical looks best.</span>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          disabled={busy}
          placeholder="360 no-scope off the rooftop"
          className="rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-faze"
          required
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-bold">Category</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <label
              key={c.id}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                category === c.id ? "border-faze bg-faze/10" : "border-line text-muted"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={c.id}
                checked={category === c.id}
                onChange={() => setCategory(c.id)}
                className="sr-only"
                disabled={busy}
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted">
        Only submit clips you made. By submitting, you agree that FaZe can feature your clip in its
        content.
      </p>

      {error && <p className="rounded-md border border-faze/40 bg-faze/10 px-3 py-2 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!ready || busy || !file || !title.trim()}
        className="rounded-md bg-faze px-5 py-3 font-bold text-white hover:bg-faze-hot disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
      >
        {busy ? progressNote : "Enter Clip Court"}
      </button>
    </form>
  );
}
