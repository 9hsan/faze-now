import type { Tables } from "@/lib/database.types";

export type Post = Tables<"posts">;
export type Creator = Tables<"creators">;

/** Row from the posts_feed view (view columns are typed nullable; these are always present). */
export type FeedPost = Post & {
  author_username: string | null;
  author_avatar: string | null;
  creator_name: string | null;
  hot: number | null;
};

export type PostStatus = Post["status"];

export const STATUS: Record<string, { label: string; className: string } | undefined> = {
  seen: { label: "Seen by creator", className: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  considering: {
    label: "Under consideration",
    className: "border-gold/40 bg-gold/10 text-gold",
  },
  fulfilled: { label: "Made it ✓", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
};

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Monday (UTC) of the current week as YYYY-MM-DD: the key for the weekly in-video segment. */
export function currentWeek(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

/** Accepts a YouTube URL (watch, youtu.be, shorts, embed) or a bare 11-char id. */
export function parseYouTubeId(input: string) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12) || null;
    const v = u.searchParams.get("v");
    if (v) return v.slice(0, 11);
    const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
    return m ? m[2] : null;
  } catch {
    return null;
  }
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function authorLabel(p: Pick<FeedPost, "author_username" | "source" | "source_author">) {
  if (p.author_username) return `@${p.author_username}`;
  if (p.source === "youtube") return p.source_author ? `${p.source_author} · via YouTube` : "via YouTube";
  return p.source_author ? `@${p.source_author}` : "a fan";
}
