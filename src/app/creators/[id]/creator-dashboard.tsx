"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { BarList, SplitBar, SplitLegend, StatTile } from "@/components/charts";
import { friendlyError } from "@/lib/clips";
import { STATUS, authorLabel, timeAgo, type Creator, type FeedPost } from "@/lib/call";
import { computeCreatorStats, compactNum, pct, splitShare, type CreatorStats, type Theme } from "@/lib/insights";
import type { Tables } from "@/lib/database.types";

type Summary = Tables<"creator_summaries">;

export function CreatorDashboard() {
  const { id } = useParams<{ id: string }>();
  const { ready, profile } = useAuth();
  const [creator, setCreator] = useState<Creator | null | undefined>(undefined);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!ready || !id) return;
    let stale = false;
    const supabase = getSupabase();
    Promise.all([
      supabase.from("creators").select("*").order("sort"),
      supabase.from("posts_feed").select("*").eq("creator_id", id).neq("status", "removed").limit(1000),
      supabase.from("themes").select("*").eq("creator_id", id),
      supabase.from("creator_summaries").select("*").eq("creator_id", id).order("week_of", { ascending: false }).limit(1),
    ]).then(([{ data: creators }, { data: posts }, { data: themes }, { data: sums }]) => {
      if (stale) return;
      const cs = creators ?? [];
      const me = cs.find((c) => c.id === id) ?? null;
      setCreator(me);
      setSummary(sums?.[0] ?? null);
      if (me) setStats(computeCreatorStats(id, (posts as FeedPost[] | null) ?? [], (themes as Theme[] | null) ?? [], cs));
    });
    return () => {
      stale = true;
    };
  }, [ready, id, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  if (creator === null) {
    return (
      <p className="rounded-xl border border-line bg-surface px-6 py-10 text-center text-muted">
        No creator called &ldquo;{id}&rdquo;. <Link href="/creators" className="underline">See all creators</Link>
      </p>
    );
  }
  if (!creator || !stats) return <div className="h-96 animate-pulse rounded-xl bg-surface" />;

  const share = splitShare(stats.split);
  const short = creator.name.replace(/^FaZe\s+/i, "");
  const isAdmin = !!profile?.is_admin;

  return (
    <div className="grid gap-8">
      <header>
        <Link href="/creators" className="text-sm text-muted hover:text-fg">
          ← All creators
        </Link>
        <p className="eyebrow mt-4">Creator Insights</p>
        <h1 className="display mt-2 text-5xl md:text-6xl">{creator.name}</h1>
      </header>

      {summary && (
        <section className="rounded-xl border border-faze/40 bg-faze/5 p-5">
          <p className="eyebrow">This week from your fans</p>
          <p className="mt-2 text-lg leading-relaxed">{summary.summary}</p>
          <p className="mt-2 text-xs text-muted">
            Week of {new Date(`${summary.week_of}T00:00:00Z`).toLocaleDateString(undefined, { month: "long", day: "numeric", timeZone: "UTC" })} ·
            summarized from {stats.requests} posts
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Ideas" value={stats.requests} note="requests and polls" />
        <StatTile label="Fan votes" value={compactNum(stats.support)} />
        <StatTile label="Themes" value={stats.themes.length} note="grouped by topic" />
        <StatTile label="From new fans" value={pct(share.new)} note="share of support" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="display text-2xl">What they&apos;re asking for</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Themes by share of {short}&apos;s fan votes. Small requests add up here instead of getting buried.
          </p>
          <BarList
            valueLabel="Share of fan votes by theme"
            rows={stats.themes.map((t) => ({
              key: t.theme.id,
              label: t.theme.label,
              sub: `${t.posts.length} ${t.posts.length === 1 ? "idea" : "ideas"} · ${compactNum(t.support)} votes`,
              value: t.support,
              display: pct(t.share),
              title: t.theme.summary ?? undefined,
            }))}
          />
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="display text-2xl">Returning vs new fans</h2>
              <p className="mt-1 text-sm text-muted">Who backs each theme, weighted by votes.</p>
            </div>
            <SplitLegend />
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold">All of {short}&apos;s fans</p>
            <SplitBar split={stats.split} />
          </div>
          <ul className="mt-5 grid gap-4">
            {stats.themes.map((t) => (
              <li key={t.theme.id}>
                <p className="mb-1.5 truncate text-sm">{t.theme.label}</p>
                <SplitBar split={t.split} height="h-2" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PostList
          title="Top requests"
          note={`Ranked by votes, with each one's share of ${short}'s total.`}
          posts={stats.top}
          total={stats.support}
          isAdmin={isAdmin}
          onChanged={refresh}
        />
        <PostList
          title="Rising this week"
          note="Gaining votes fastest relative to age."
          posts={stats.rising}
          total={stats.support}
          isAdmin={isAdmin}
          onChanged={refresh}
        />
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="display text-2xl">Most-wanted collabs</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Creators fans mention in {short}&apos;s requests.</p>
        <BarList
          valueLabel="Votes on requests mentioning each creator"
          empty="No collab requests yet."
          rows={stats.collabs.map((c) => ({
            key: c.creator.id,
            label: `${short} × ${c.creator.name.replace(/^FaZe\s+/i, "")}`,
            sub: `${c.posts.length} ${c.posts.length === 1 ? "request" : "requests"}`,
            value: c.support,
            display: `${compactNum(c.support)} votes`,
          }))}
        />
      </section>
    </div>
  );
}

function PostList({
  title,
  note,
  posts,
  total,
  isAdmin,
  onChanged,
}: {
  title: string;
  note: string;
  posts: FeedPost[];
  total: number;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  async function setStatus(p: FeedPost, status: "seen" | "considering") {
    setMsg(null);
    const { error } = await getSupabase().rpc("set_post_status", { p_post: p.id, p_status: status });
    if (error) return setMsg(friendlyError(error.message));
    setMsg(status === "seen" ? "Marked seen. The fan was notified." : "Under consideration. The fan was notified.");
    onChanged();
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="display text-2xl">{title}</h2>
      <p className="mb-3 mt-1 text-sm text-muted">{note}</p>
      {posts.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {posts.map((p, i) => {
            const status = STATUS[p.status];
            return (
              <li key={p.id} className="flex gap-3 py-3">
                <span className="display w-6 shrink-0 text-xl text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">{p.body}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-bold tabular-nums text-fg">{compactNum(p.upvote_count)} votes</span>
                    <span>· {total ? pct(p.upvote_count / total) : "0%"} of support</span>
                    <span>· {authorLabel(p)}</span>
                    <span>· {timeAgo(p.created_at)}</span>
                    {p.author_fan_type && (
                      <span className="flex items-center gap-1">
                        ·
                        <span className={`h-2 w-2 rounded-sm ${p.author_fan_type === "new" ? "bg-new" : "bg-returning"}`} />
                        {p.author_fan_type} fan
                      </span>
                    )}
                    {status && (
                      <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.className}`}>{status.label}</span>
                    )}
                  </p>
                  {isAdmin && p.status === "open" && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button type="button" onClick={() => setStatus(p, "seen")} className="rounded border border-line px-2 py-1 hover:border-fg">
                        Mark seen
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(p, "considering")}
                        className="rounded border border-line px-2 py-1 hover:border-fg"
                      >
                        Considering
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </section>
  );
}
