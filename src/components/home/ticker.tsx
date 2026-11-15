"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/clips";

/** Live strip of what's happening on the platform, pulled from the database. */
export function Ticker() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    Promise.all([
      supabase.from("posts_feed").select("body, upvote_count, creator_name, type").neq("status", "removed").order("hot", { ascending: false }).limit(6),
      supabase.from("clips").select("title, category").eq("status", "active").order("rating", { ascending: false }).limit(2),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "fulfilled"),
      supabase.from("view_rounds").select("id, title").eq("status", "open").limit(1),
    ]).then(async ([{ data: posts }, { data: clips }, { count: made }, { data: rounds }]) => {
      const out: string[] = [];
      for (const p of posts ?? []) {
        const body = (p.body ?? "").length > 64 ? `${p.body!.slice(0, 62)}…` : p.body;
        out.push(`${p.type === "poll" ? "POLL" : "REQUEST"}${p.creator_name ? ` → ${p.creator_name}` : ""}: “${body}” · ${p.upvote_count?.toLocaleString()} votes`);
      }
      for (const c of clips ?? []) out.push(`CLIP COURT: “${c.title}” leads ${categoryLabel(c.category)}`);
      if (made) out.push(`${made} fan ${made === 1 ? "idea" : "ideas"} made into FaZe videos`);
      if (rounds?.[0]) {
        const { data: s } = await supabase.rpc("view_round_stats", { p_round: rounds[0].id });
        const n = (s as { guesses: number } | null)?.guesses ?? 0;
        out.push(`GUESS THE VIEWS: ${n.toLocaleString()} fans called the next upload`);
      }
      setItems(out);
    });
  }, []);

  if (!items.length) return <div className="bleed h-11 border-y border-line bg-surface" />;

  const row = (
    <ul className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <li key={i} className="flex items-center whitespace-nowrap px-6 text-sm">
          <span className="mr-6 h-1.5 w-1.5 rounded-full bg-faze" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bleed overflow-hidden border-y border-line bg-surface py-3" aria-label="Live on Faze Now">
      <div className="marquee flex w-max">
        {row}
        <div aria-hidden className="flex">{row}</div>
      </div>
    </div>
  );
}
