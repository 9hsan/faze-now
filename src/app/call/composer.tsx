"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import type { Creator, FeedPost } from "@/lib/call";

const MAX = 280;

export function Composer({
  creators,
  onPosted,
}: {
  creators: Creator[];
  onPosted: (post: FeedPost) => void;
}) {
  const { ready, refreshProfile } = useAuth();
  const [type, setType] = useState<"request" | "poll">("request");
  const [body, setBody] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = body.trim();
  const canPost = ready && !busy && trimmed.length >= 5 && trimmed.length <= MAX;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error: insErr } = await supabase
      .from("posts")
      .insert({ type, body: trimmed, creator_id: creatorId || null })
      .select("id")
      .single();
    if (insErr || !data) {
      setBusy(false);
      setError(friendlyError(insErr?.message));
      return;
    }
    const { data: row } = await supabase.from("posts_feed").select("*").eq("id", data.id).single();
    setBusy(false);
    setBody("");
    if (row) onPosted(row as FeedPost);
    refreshProfile();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Post type">
        {(
          [
            ["request", "Request"],
            ["poll", "Yes/No poll"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={type === id}
            onClick={() => setType(id)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              type === id ? "border-faze bg-faze text-white" : "border-line text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder={
          type === "request"
            ? "Swagg, drop a nuke in every COD ever made!!"
            : "Should FaZe remake the 2012 1M subscriber montage with today's creators?"
        }
        className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 outline-none focus:border-faze"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          {type === "request" ? "For" : "About"}
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="rounded-md border border-line bg-bg px-2 py-1.5 text-fg"
          >
            <option value="">{type === "request" ? "Any creator" : "FaZe in general"}</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span className={`ml-auto text-xs tabular-nums ${MAX - body.length < 20 ? "text-faze-hot" : "text-muted"}`}>
          {MAX - body.length}
        </span>
        <button
          type="submit"
          disabled={!canPost}
          className="rounded-md bg-faze px-4 py-2 text-sm font-bold text-white hover:bg-faze-hot disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {busy ? "Posting…" : "Post · +5 pts"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-faze-hot">{error}</p>}
    </form>
  );
}
