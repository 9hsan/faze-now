import type { Tables } from "@/lib/database.types";

export type Clip = Tables<"clips">;

export const CATEGORIES = [
  { id: "trickshot", label: "Trickshots" },
  { id: "montage", label: "Montages" },
  { id: "funny", label: "Funny" },
  { id: "tribute", label: "FaZe Tribute" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export function clipVideoUrl(clip: Pick<Clip, "video_path">) {
  return `${BASE}/clips/${clip.video_path}`;
}

export function clipThumbUrl(clip: Pick<Clip, "thumb_path">) {
  return clip.thumb_path ? `${BASE}/thumbs/${clip.thumb_path}` : undefined;
}

export function clipAuthor(clip: Pick<Clip, "creator_label">, ownerUsername?: string | null) {
  return ownerUsername ? `@${ownerUsername}` : (clip.creator_label ?? "Community clip");
}

/**
 * Seconds a voter must actually watch before their vote counts.
 * Mirrors the server check in cast_clip_vote: least(10, duration) - 1.
 */
export function requiredWatchSeconds(duration: number | null | undefined) {
  const d = duration && duration > 0 ? duration : 10;
  return Math.max(0, Math.min(10, d) - 1);
}

/** Supabase errors from RAISE EXCEPTION come back with the message we wrote in SQL. */
export function friendlyError(message: string | undefined) {
  if (!message) return "Something went wrong. Try again.";
  return message.replace(/^.*?ERROR:\s*/i, "");
}
