#!/usr/bin/env node
/**
 * AI theme grouping + weekly summaries for Creator Insights.
 *
 * For each creator, sends every live post (requests and polls, with vote counts and the author's
 * fan type) to Claude, which groups them into themes and writes a short weekly summary. The result
 * replaces that creator's themes and this week's summary.
 *
 *   npm run themes              # all creators
 *   npm run themes -- swagg kay # only these
 *   npm run themes -- --dry-run # print the result, write nothing
 *
 * Needs ANTHROPIC_API_KEY in .env.local.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { z } from "zod";

const MODEL = "claude-opus-5-5";
const MAX_THEMES = 6;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.filter((a) => !a.startsWith("--"));

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("✖ ANTHROPIC_API_KEY is missing from .env.local");
  process.exit(1);
}

const anthropic = new Anthropic();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const Grouping = z.object({
  themes: z
    .array(
      z.object({
        label: z.string().describe("2-5 word theme name, Title Case, no emoji"),
        summary: z.string().describe("One sentence on what fans in this theme want"),
        post_numbers: z.array(z.number().int()).describe("Numbers of the posts in this theme"),
      }),
    )
    .describe(`Between 1 and ${MAX_THEMES} themes`),
  weekly_summary: z
    .string()
    .describe("2-3 sentences addressed to the creator's team about what fans want most this week"),
});

const SYSTEM = `You help a gaming creator's team understand what their fans are asking for.

You get every fan post tagged to one creator on a fan platform: requests ("do X") and yes/no polls. Each post has a number, its vote count, and whether the author is a returning fan (followed FaZe for years) or a new fan.

Group the posts into themes:
- Put every post in exactly one theme. Use each post number once.
- Themes are about what fans want made (a format, a game, a reunion, nostalgia, a collab), not about wording.
- Up to ${MAX_THEMES} themes. A theme can have a single post if it's genuinely distinct. Don't make a catch-all "Other" theme unless a post fits nothing.
- Labels are short, concrete and specific to this creator's fans.

Then write the weekly summary for the creator's team: 2-3 plain sentences naming the biggest asks, using vote counts as the measure of support. Say where new and returning fans want different things, when the data shows it. Point out a small request only if its fans are unusually unified. No hype, no emoji.`;

function mondayUTC(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

async function groupCreator(creator, posts) {
  const lines = posts.map(
    (p, i) =>
      `${i + 1}. [${p.type}] [${p.upvote_count} votes] [${p.author_fan_type ?? "unknown"} fan] ${p.body.replace(/\s+/g, " ")}`,
  );

  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Grouping) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Creator: ${creator.name}\nPosts (${posts.length}):\n${lines.join("\n")}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new Error("rate limited; try again in a minute");
    if (err instanceof Anthropic.AuthenticationError) throw new Error("ANTHROPIC_API_KEY was rejected");
    if (err instanceof Anthropic.APIError) throw new Error(`API error ${err.status}: ${err.message}`);
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new Error(`declined (${response.stop_details?.category ?? "no category"})`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("output was cut off (max_tokens)");
  const out = response.parsed_output;
  if (!out) throw new Error("response didn't match the schema");

  // Map post numbers back to ids; every post lands in exactly one theme
  const seen = new Set();
  const themes = out.themes
    .slice(0, MAX_THEMES)
    .map((t) => ({
      label: t.label.trim().slice(0, 60),
      summary: t.summary.trim(),
      ids: t.post_numbers
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= posts.length && !seen.has(n) && seen.add(n))
        .map((n) => posts[n - 1].id),
    }))
    .filter((t) => t.ids.length > 0);

  const missing = posts.filter((_, i) => !seen.has(i + 1));
  if (missing.length) {
    themes.push({ label: "Other ideas", summary: "Requests that didn't fit another theme.", ids: missing.map((p) => p.id) });
  }

  return { themes, summary: out.weekly_summary.trim(), usage: response.usage };
}

async function writeCreator(creatorId, posts, result) {
  const byId = new Map(posts.map((p) => [p.id, p]));
  // Deleting the old themes clears posts.theme_id (FK on delete set null)
  const del = await db.from("themes").delete().eq("creator_id", creatorId);
  if (del.error) throw del.error;

  for (const t of result.themes) {
    const support = t.ids.reduce((s, id) => s + (byId.get(id)?.upvote_count ?? 0), 0);
    const { data: theme, error } = await db
      .from("themes")
      .insert({ creator_id: creatorId, label: t.label, summary: t.summary, post_count: t.ids.length, total_support: support })
      .select("id")
      .single();
    if (error) throw error;
    const upd = await db.from("posts").update({ theme_id: theme.id }).in("id", t.ids);
    if (upd.error) throw upd.error;
  }

  const sum = await db
    .from("creator_summaries")
    .upsert({ creator_id: creatorId, week_of: mondayUTC(), summary: result.summary, generated_at: new Date().toISOString() }, { onConflict: "creator_id,week_of" });
  if (sum.error) throw sum.error;
}

const { data: creators, error: cErr } = await db.from("creators").select("id, name").order("sort");
if (cErr) throw cErr;

let done = 0;
let inTok = 0;
let outTok = 0;
for (const creator of creators.filter((c) => !only.length || only.includes(c.id))) {
  const { data: posts, error } = await db
    .from("posts")
    .select("id, type, body, upvote_count, author_fan_type")
    .eq("creator_id", creator.id)
    .neq("status", "removed")
    .order("upvote_count", { ascending: false })
    .limit(400);
  if (error) throw error;
  if (!posts.length) {
    console.log(`– ${creator.name}: no posts, skipped`);
    continue;
  }

  process.stdout.write(`… ${creator.name}: grouping ${posts.length} posts… `);
  try {
    const result = await groupCreator(creator, posts);
    inTok += result.usage.input_tokens;
    outTok += result.usage.output_tokens;
    if (dryRun) {
      console.log("\n" + result.themes.map((t) => `   • ${t.label} (${t.ids.length})`).join("\n"));
      console.log(`   Summary: ${result.summary}`);
    } else {
      await writeCreator(creator.id, posts, result);
      console.log(`✔ ${result.themes.length} themes`);
    }
    done++;
  } catch (err) {
    console.log(`✖ ${err.message ?? err}`);
  }
}
console.log(`\n${dryRun ? "Dry run: " : ""}${done} creators grouped · ${inTok} input / ${outTok} output tokens`);
