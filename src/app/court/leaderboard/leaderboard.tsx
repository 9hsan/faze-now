"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, clipAuthor, clipThumbUrl, type CategoryId, type Clip } from "@/lib/clips";

type Row = Clip & { owner: { username: string } | null };

export function Leaderboard() {
  const [category, setCategory] = useState<CategoryId>("trickshot");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from("clips")
      .select("*, owner:profiles!clips_owner_id_fkey(username)")
      .eq("status", "active")
      .eq("category", category)
      .order("rating", { ascending: false })
      .limit(25)
      .then(({ data }) => {
        if (!cancelled) setRows((data as Row[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.id === category) return;
              setRows(null);
              setCategory(c.id);
            }}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              category === c.id ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface" />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-6 py-10 text-center text-muted">
          No clips in this category yet.
        </p>
      ) : (
        <ol className="overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map((c, i) => {
            const thumb = clipThumbUrl(c);
            const losses = c.matches - c.wins;
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 sm:gap-4 sm:px-4"
              >
                <span
                  className={`display w-8 shrink-0 text-center text-2xl ${
                    i === 0 ? "text-gold" : i < 3 ? "text-fg" : "text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-surface-2 sm:h-16 sm:w-12">
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{c.title}</p>
                  <p className="truncate text-sm text-muted">{clipAuthor(c, c.owner?.username)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="display text-2xl tabular-nums">{Math.round(c.rating)}</p>
                  <p className="text-xs tabular-nums text-muted">
                    {c.wins}–{losses} · {c.impressions} views
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted">
        Ratings use Elo: beating a higher-rated clip is worth more. Everyone starts at 1000.
      </p>
    </div>
  );
}
