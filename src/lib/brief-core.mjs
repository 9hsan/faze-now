// AI creator briefs with Gemini. Plain JS so both the Next.js route and the local script use it.
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const DEFAULT_MODEL = "gemini-3.5-flash";
const MAX_THEMES = 6;
const MAX_POSTS = 400;

const SYSTEM = `You help a gaming creator's team understand what their fans are asking for.

You get every fan post tagged to one creator on a fan platform: requests ("do X") and yes/no polls. Each post has a number, its vote count, and whether the author is a returning fan (followed FaZe for years) or a new fan.

Group the posts into themes:
- Put every post in exactly one theme. Use each post number once.
- Themes are about what fans want made (a format, a game, a reunion, nostalgia, a collab), not about wording.
- Up to ${MAX_THEMES} themes. A theme can have a single post if it is genuinely distinct. Avoid a catch-all theme unless a post fits nothing else.
- Labels: 2 to 5 words, Title Case, specific to this creator's fans, no emoji.
- Theme summary: one sentence on what fans in that theme want.

Then write the weekly brief for the creator's team: 2 to 3 plain sentences naming the biggest asks, using vote counts as the measure of support. Say where new and returning fans want different things when the data shows it. Point out a small request only if its fans are unusually unified. No hype, no emoji.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    themes: {
      type: "array",
      minItems: 1,
      maxItems: MAX_THEMES,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          summary: { type: "string" },
          post_numbers: { type: "array", items: { type: "integer" } },
        },
        required: ["label", "summary", "post_numbers"],
      },
    },
    weekly_brief: { type: "string" },
  },
  required: ["themes", "weekly_brief"],
};

const Parsed = z.object({
  themes: z
    .array(z.object({ label: z.string().min(1), summary: z.string(), post_numbers: z.array(z.number().int()) }))
    .min(1),
  weekly_brief: z.string().min(1),
});

/**
 * @param {{ apiKey: string, model?: string, creatorName: string,
 *           posts: { id: string, type: string, body: string, upvote_count: number, author_fan_type: string | null }[] }} args
 * @returns {Promise<{ themes: { label: string, summary: string, post_ids: string[] }[], summary: string, model: string }>}
 */
export async function generateBrief({ apiKey, model = DEFAULT_MODEL, creatorName, posts }) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!posts.length) throw new Error("No posts to summarize yet");
  const list = posts.slice(0, MAX_POSTS);

  const lines = list.map(
    (p, i) =>
      `${i + 1}. [${p.type}] [${p.upvote_count} votes] [${p.author_fan_type ?? "unknown"} fan] ${p.body.replace(/\s+/g, " ")}`,
  );

  const ai = new GoogleGenAI({ apiKey });
  let res;
  try {
    res = await ai.models.generateContent({
      model,
      contents: `Creator: ${creatorName}\nPosts (${list.length}):\n${lines.join("\n")}`,
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        // Grouping is easy; low thinking keeps the live "Regenerate" button fast
        thinkingConfig: { thinkingLevel: "LOW" },
      },
    });
  } catch (err) {
    const status = err?.status ?? err?.code;
    if (status === 429) throw new Error("Gemini rate limit hit. Try again in a minute.");
    if (status === 401 || status === 403) throw new Error("Gemini rejected the API key.");
    throw new Error(`Gemini request failed${status ? ` (${status})` : ""}: ${err?.message ?? err}`);
  }

  const text = res.text;
  if (!text) {
    const reason = res.candidates?.[0]?.finishReason ?? res.promptFeedback?.blockReason ?? "no output";
    throw new Error(`Gemini returned no brief (${reason})`);
  }

  let parsed;
  try {
    parsed = Parsed.parse(JSON.parse(text));
  } catch {
    throw new Error("Gemini's answer wasn't in the expected format. Try again.");
  }

  // Numbers -> ids; each post in exactly one theme; leftovers kept, not dropped
  const used = new Set();
  const themes = parsed.themes
    .slice(0, MAX_THEMES)
    .map((t) => ({
      label: t.label.trim().slice(0, 60),
      summary: t.summary.trim(),
      post_ids: t.post_numbers
        .filter((n) => n >= 1 && n <= list.length && !used.has(n) && used.add(n))
        .map((n) => list[n - 1].id),
    }))
    .filter((t) => t.post_ids.length > 0);

  const missing = list.filter((_, i) => !used.has(i + 1));
  if (missing.length) {
    themes.push({ label: "Other Ideas", summary: "Requests that didn't fit another theme.", post_ids: missing.map((p) => p.id) });
  }

  return { themes, summary: parsed.weekly_brief.trim(), model };
}
