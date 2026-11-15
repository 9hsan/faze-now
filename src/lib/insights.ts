import type { Creator, FeedPost } from "@/lib/call";
import type { Tables } from "@/lib/database.types";

export type Theme = Tables<"themes">;

export type Split = { returning: number; new: number; unknown: number };

export type ThemeStat = {
  theme: Theme;
  support: number;
  share: number; // of the creator's total support
  posts: FeedPost[];
  split: Split; // support-weighted
};

export type CreatorStats = {
  posts: FeedPost[];
  requests: number;
  support: number;
  made: number;
  split: Split;
  themes: ThemeStat[];
  top: FeedPost[];
  rising: FeedPost[];
  collabs: { creator: Creator; support: number; posts: FeedPost[] }[];
};

const emptySplit = (): Split => ({ returning: 0, new: 0, unknown: 0 });

function addToSplit(s: Split, p: FeedPost) {
  const w = Math.max(1, p.upvote_count);
  if (p.author_fan_type === "returning") s.returning += w;
  else if (p.author_fan_type === "new") s.new += w;
  else s.unknown += w;
}

export function splitShare(s: Split) {
  const known = s.returning + s.new;
  return known ? { returning: s.returning / known, new: s.new / known } : { returning: 0, new: 0 };
}

/** "FaZe Swagg" -> "swagg"; used to spot collab mentions in request text. */
function mentionKey(c: Creator) {
  return c.name.replace(/^faze\s+/i, "").trim().toLowerCase();
}

export function mentionedCreators(body: string, creators: Creator[], exclude?: string) {
  const text = body.toLowerCase();
  return creators.filter((c) => {
    if (c.id === exclude || c.id === "faze") return false;
    const key = mentionKey(c);
    return new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
  });
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

export function computeCreatorStats(
  creatorId: string,
  posts: FeedPost[],
  themes: Theme[],
  creators: Creator[],
): CreatorStats {
  const live = posts.filter((p) => p.status !== "removed");
  const support = live.reduce((s, p) => s + p.upvote_count, 0);
  const split = emptySplit();
  live.forEach((p) => addToSplit(split, p));

  const themeStats: ThemeStat[] = themes
    .map((theme) => {
      const tp = live.filter((p) => p.theme_id === theme.id);
      const ts = emptySplit();
      tp.forEach((p) => addToSplit(ts, p));
      const tSupport = tp.reduce((s, p) => s + p.upvote_count, 0);
      return { theme, support: tSupport, share: support ? tSupport / support : 0, posts: tp, split: ts };
    })
    .filter((t) => t.posts.length > 0)
    .sort((a, b) => b.support - a.support);

  const open = live.filter((p) => p.status !== "fulfilled");
  const top = [...open].sort((a, b) => b.upvote_count - a.upvote_count).slice(0, 5);
  const weekAgo = Date.now() - WEEK_MS;
  const rising = open
    .filter((p) => new Date(p.created_at).getTime() > weekAgo)
    .sort((a, b) => (b.hot ?? 0) - (a.hot ?? 0))
    .slice(0, 5);

  const collabMap = new Map<string, { creator: Creator; support: number; posts: FeedPost[] }>();
  for (const p of live) {
    for (const c of mentionedCreators(p.body, creators, creatorId)) {
      const e = collabMap.get(c.id) ?? { creator: c, support: 0, posts: [] };
      e.support += p.upvote_count;
      e.posts.push(p);
      collabMap.set(c.id, e);
    }
  }

  return {
    posts: live,
    requests: live.length,
    support,
    made: live.filter((p) => p.status === "fulfilled").length,
    split,
    themes: themeStats,
    top,
    rising,
    collabs: [...collabMap.values()].sort((a, b) => b.support - a.support),
  };
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function compactNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}
