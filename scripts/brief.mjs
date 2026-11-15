#!/usr/bin/env node
/**
 * Regenerate AI themes + weekly briefs with Gemini (same logic as the dashboard button).
 *
 *   npm run brief              # every creator with posts
 *   npm run brief -- swagg kay # only these
 *
 * Needs GEMINI_API_KEY (and optionally GEMINI_MODEL) in .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { DEFAULT_MODEL, generateBrief } from "../src/lib/brief-core.mjs";

const only = process.argv.slice(2);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const { data: creators, error } = await db.from("creators").select("id, name").order("sort");
if (error) throw error;

let ok = 0;
for (const c of creators.filter((x) => !only.length || only.includes(x.id))) {
  const { data: posts } = await db
    .from("posts")
    .select("id, type, body, upvote_count, author_fan_type")
    .eq("creator_id", c.id)
    .neq("status", "removed")
    .order("upvote_count", { ascending: false })
    .limit(400);
  if (!posts?.length) {
    console.log(`– ${c.name}: no posts`);
    continue;
  }
  process.stdout.write(`… ${c.name} (${posts.length} posts) `);
  try {
    // Free-tier keys have low per-minute limits: back off and retry on rate limits
    let brief;
    for (let attempt = 1; ; attempt++) {
      try {
        brief = await generateBrief({
          apiKey: process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
          creatorName: c.name,
          posts,
        });
        break;
      } catch (err) {
        if (!/rate limit/i.test(err.message) || attempt >= 4) throw err;
        const wait = 20 * attempt;
        process.stdout.write(`(rate limited, waiting ${wait}s) `);
        await new Promise((r) => setTimeout(r, wait * 1000));
      }
    }
    const { data, error: e } = await db.rpc("apply_creator_brief", {
      p_creator: c.id,
      p_themes: brief.themes,
      p_summary: brief.summary,
      p_model: brief.model,
    });
    if (e) throw e;
    console.log(`✔ ${data.themes} themes`);
    ok++;
  } catch (err) {
    console.log(`✖ ${err.message ?? err}`);
  }
}
console.log(`\n${ok} creators briefed with ${process.env.GEMINI_MODEL || DEFAULT_MODEL}`);
