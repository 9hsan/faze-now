"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { SplitBar, SplitLegend, StatTile } from "@/components/charts";
import { computeCreatorStats, compactNum, pct, splitShare, type CreatorStats, type Theme } from "@/lib/insights";
import type { Creator, FeedPost } from "@/lib/call";

type Row = { creator: Creator; stats: CreatorStats };

export function CreatorsOverview() {
  const { ready } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    const supabase = getSupabase();
    Promise.all([
      supabase.from("creators").select("*").order("sort"),
      supabase.from("posts_feed").select("*").not("creator_id", "is", null).neq("status", "removed").limit(2000),
      supabase.from("themes").select("*"),
    ]).then(([{ data: creators }, { data: posts }, { data: themes }]) => {
      if (stale) return;
      const cs = creators ?? [];
      const ps = (posts as FeedPost[] | null) ?? [];
      const ts = (themes as Theme[] | null) ?? [];
      setRows(
        cs.map((c) => ({
          creator: c,
          stats: computeCreatorStats(
            c.id,
            ps.filter((p) => p.creator_id === c.id),
            ts.filter((t) => t.creator_id === c.id),
            cs,
          ),
        })),
      );
    });
    return () => {
      stale = true;
    };
  }, [ready]);

  if (!rows) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const totals = rows.reduce(
    (t, r) => ({
      requests: t.requests + r.stats.requests,
      support: t.support + r.stats.support,
      made: t.made + r.stats.made,
      returning: t.returning + r.stats.split.returning,
      new: t.new + r.stats.split.new,
    }),
    { requests: 0, support: 0, made: 0, returning: 0, new: 0 },
  );
  const newShare = splitShare({ returning: totals.returning, new: totals.new, unknown: 0 }).new;

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Ideas posted" value={compactNum(totals.requests)} />
        <StatTile label="Fan votes" value={compactNum(totals.support)} />
        <StatTile label="Made it" value={totals.made} note="requests turned into videos" />
        <StatTile label="From new fans" value={pct(newShare)} note="share of support" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="display text-3xl">Every creator&apos;s board</h2>
        <SplitLegend />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ creator, stats }) => {
          const topTheme = stats.themes[0];
          const topPost = stats.top[0];
          return (
            <Link
              key={creator.id}
              href={`/creators/${creator.id}`}
              className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-faze"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="display text-2xl">{creator.name}</h3>
                <span className="text-xs tabular-nums text-muted">
                  {stats.requests} ideas · {compactNum(stats.support)} votes
                </span>
              </div>

              {topTheme ? (
                <p className="mt-3 text-sm">
                  <span className="text-muted">Top theme:</span>{" "}
                  <span className="font-semibold">{topTheme.theme.label}</span>{" "}
                  <span className="tabular-nums text-muted">· {pct(topTheme.share)} of support</span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">No themes yet.</p>
              )}

              {topPost && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  #1 ask: <span className="text-fg">&ldquo;{topPost.body}&rdquo;</span>
                </p>
              )}

              <div className="mt-auto pt-4">
                <SplitBar split={stats.split} height="h-2" />
              </div>
              <span className="mt-3 text-sm font-bold text-faze group-hover:text-faze-hot">Open dashboard →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
