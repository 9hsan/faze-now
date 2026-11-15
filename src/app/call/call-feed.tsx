"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import { currentWeek, type Creator, type FeedPost, type Post } from "@/lib/call";
import { Composer } from "./composer";
import { PostCard, type MyVotes } from "./post-card";

type Sort = "hot" | "new" | "made";
type TypeFilter = "all" | "request" | "poll";

const PAGE = 40;

export function CallFeed() {
  const { ready, profile, refreshProfile } = useAuth();
  const supabase = getSupabase();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [sort, setSort] = useState<Sort>("hot");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [featured, setFeatured] = useState<FeedPost[]>([]);
  const [mine, setMine] = useState<Record<string, MyVotes>>({});
  const [freshCount, setFreshCount] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setPosts(null);
    setFreshCount(0);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    supabase
      .from("creators")
      .select("*")
      .order("sort")
      .then(({ data }) => setCreators(data ?? []));
  }, [supabase]);

  // Feed + this week's featured picks + my votes
  useEffect(() => {
    if (!ready) return;
    let stale = false;

    (async () => {
      let q = supabase.from("posts_feed").select("*").neq("status", "removed");
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      if (creatorFilter) q = q.eq("creator_id", creatorFilter);
      if (sort === "made") q = q.eq("status", "fulfilled").order("fulfilled_at", { ascending: false });
      else if (sort === "new") q = q.order("created_at", { ascending: false });
      else q = q.order("hot", { ascending: false });

      const [{ data: feed, error: feedErr }, { data: picks }] = await Promise.all([
        q.limit(PAGE),
        supabase
          .from("posts_feed")
          .select("*")
          .eq("featured_week", currentWeek())
          .neq("status", "removed")
          .order("upvote_count", { ascending: false })
          .limit(3),
      ]);

      const list = (feed as FeedPost[] | null) ?? [];
      const top = (picks as FeedPost[] | null) ?? [];
      const ids = [...new Set([...list, ...top].map((p) => p.id))];
      const votes: Record<string, MyVotes> = {};
      if (profile && ids.length) {
        const [{ data: ups }, { data: polls }] = await Promise.all([
          supabase.from("post_upvotes").select("post_id").eq("user_id", profile.id).in("post_id", ids),
          supabase.from("poll_votes").select("post_id, choice").eq("user_id", profile.id).in("post_id", ids),
        ]);
        for (const u of ups ?? []) votes[u.post_id] = { ...votes[u.post_id], upvoted: true };
        for (const p of polls ?? [])
          votes[p.post_id] = { upvoted: votes[p.post_id]?.upvoted ?? false, poll: p.choice as "yes" | "no" };
      }
      return { list, top, votes, feedErr };
    })().then(({ list, top, votes, feedErr }) => {
      if (stale) return;
      setError(feedErr ? friendlyError(feedErr.message) : null);
      setPosts(list);
      setFeatured(top);
      setMine((m) => ({ ...m, ...votes }));
    });

    return () => {
      stale = true;
    };
  }, [ready, supabase, profile, sort, typeFilter, creatorFilter, nonce]);

  // Live: counts/status changes patch in place; new posts show a "new posts" pill
  useEffect(() => {
    const channel = supabase
      .channel("the-call")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        const row = payload.new as Post;
        const patch = (p: FeedPost) => (p.id === row.id ? { ...p, ...row } : p);
        setPosts((ps) => ps?.map(patch).filter((p) => p.status !== "removed") ?? ps);
        setFeatured((fs) => fs.map(patch).filter((p) => p.status !== "removed"));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const row = payload.new as Post;
        if (row.author_id && row.author_id === profile?.id) return;
        setFreshCount((n) => n + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile?.id]);

  const patchPost = useCallback((id: string, fn: (p: FeedPost) => FeedPost) => {
    setPosts((ps) => ps?.map((p) => (p.id === id ? fn(p) : p)) ?? ps);
    setFeatured((fs) => fs.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  const onUpvote = useCallback(
    async (post: FeedPost) => {
      if (!profile) return;
      const was = mine[post.id]?.upvoted ?? false;
      setMine((m) => ({ ...m, [post.id]: { ...m[post.id], upvoted: !was } }));
      patchPost(post.id, (p) => ({ ...p, upvote_count: Math.max(0, p.upvote_count + (was ? -1 : 1)) }));

      const { error: e } = was
        ? await supabase.from("post_upvotes").delete().eq("post_id", post.id).eq("user_id", profile.id)
        : await supabase.from("post_upvotes").insert({ post_id: post.id });
      if (e && e.code !== "23505") {
        setMine((m) => ({ ...m, [post.id]: { ...m[post.id], upvoted: was } }));
        patchPost(post.id, (p) => ({ ...p, upvote_count: Math.max(0, p.upvote_count + (was ? 1 : -1)) }));
        setError(friendlyError(e.message));
      }
    },
    [profile, mine, supabase, patchPost],
  );

  const onPollVote = useCallback(
    async (post: FeedPost, choice: "yes" | "no") => {
      if (!profile || mine[post.id]?.poll) return;
      setMine((m) => ({ ...m, [post.id]: { upvoted: m[post.id]?.upvoted ?? false, poll: choice } }));
      const key = choice === "yes" ? "yes_count" : "no_count";
      patchPost(post.id, (p) => ({ ...p, [key]: p[key] + 1 }));

      const { error: e } = await supabase.from("poll_votes").insert({ post_id: post.id, choice });
      if (e && e.code !== "23505") {
        setMine((m) => ({ ...m, [post.id]: { upvoted: m[post.id]?.upvoted ?? false } }));
        patchPost(post.id, (p) => ({ ...p, [key]: Math.max(0, p[key] - 1) }));
        setError(friendlyError(e.message));
        return;
      }
      refreshProfile();
    },
    [profile, mine, supabase, patchPost, refreshProfile],
  );

  const onAdminChange = useCallback(
    (updated: FeedPost) => {
      if (updated.status === "removed") {
        setPosts((ps) => ps?.filter((p) => p.id !== updated.id) ?? ps);
        setFeatured((fs) => fs.filter((p) => p.id !== updated.id));
        return;
      }
      patchPost(updated.id, () => updated);
      const week = currentWeek();
      setFeatured((fs) => {
        const without = fs.filter((p) => p.id !== updated.id);
        return updated.featured_week === week ? [updated, ...without].slice(0, 3) : without;
      });
    },
    [patchPost],
  );

  const onPosted = useCallback((post: FeedPost) => {
    setPosts((ps) => [post, ...(ps ?? [])]);
  }, []);

  const featuredIds = useMemo(() => new Set(featured.map((f) => f.id)), [featured]);
  const isAdmin = !!profile?.is_admin;
  const cardProps = { isAdmin, onUpvote, onPollVote, onAdminChange };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        {featured.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="eyebrow">This week&apos;s Call</p>
                <h2 className="display mt-1 text-3xl">Answered in FaZe&apos;s next upload</h2>
              </div>
            </div>
            <div className="grid gap-3">
              {featured.map((p) => (
                <PostCard key={p.id} post={p} mine={mine[p.id] ?? { upvoted: false }} big {...cardProps} />
              ))}
            </div>
          </section>
        )}

        <Composer creators={creators} onPosted={onPosted} />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(
            [
              ["hot", "Hot"],
              ["new", "New"],
              ["made", "Made it"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              active={sort === id}
              onClick={() => {
                if (sort === id) return;
                setPosts(null);
                setSort(id);
              }}
            >
              {label}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden />
          {(
            [
              ["all", "All"],
              ["request", "Requests"],
              ["poll", "Polls"],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              active={typeFilter === id}
              onClick={() => {
                if (typeFilter === id) return;
                setPosts(null);
                setTypeFilter(id);
              }}
            >
              {label}
            </Chip>
          ))}
        </div>

        {creatorFilter && (
          <p className="mt-3 text-sm text-muted">
            Showing posts for <span className="font-bold text-fg">{creators.find((c) => c.id === creatorFilter)?.name}</span>{" "}
            ·{" "}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-fg"
              onClick={() => {
                setPosts(null);
                setCreatorFilter(null);
              }}
            >
              show everyone
            </button>
          </p>
        )}

        {freshCount > 0 && (
          <button
            type="button"
            onClick={reload}
            className="sticky top-16 z-20 mx-auto mt-4 block rounded-full bg-faze px-4 py-1.5 text-sm font-bold text-white shadow-lg"
          >
            {freshCount} new {freshCount === 1 ? "post" : "posts"} ↑
          </button>
        )}

        {error && <p className="mt-4 rounded-md border border-faze/40 bg-faze/10 px-3 py-2 text-sm">{error}</p>}

        <div className="mt-4 grid gap-3">
          {posts === null ? (
            Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-surface" />)
          ) : posts.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface px-6 py-10 text-center text-muted">
              {sort === "made" ? "Nothing made yet. Back the ideas you want to see." : "Nothing here yet. Be the first."}
            </p>
          ) : (
            posts
              .filter((p) => sort !== "hot" || !featuredIds.has(p.id))
              .map((p) => <PostCard key={p.id} post={p} mine={mine[p.id] ?? { upvoted: false }} {...cardProps} />)
          )}
        </div>
      </div>

      <aside className="order-first lg:order-none">
        <div className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-20">
          <p className="eyebrow">Filter by creator</p>
          <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
            {creators.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setPosts(null);
                  setCreatorFilter((cur) => (cur === c.id ? null : c.id));
                }}
                className={`rounded-md border px-3 py-1.5 text-left text-sm font-semibold ${
                  creatorFilter === c.id ? "border-faze bg-faze/10" : "border-line text-muted hover:text-fg"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-5 hidden border-t border-line pt-4 text-sm text-muted lg:block">
            <p className="font-bold text-fg">How The Call works</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>Post a request or a yes/no poll.</li>
              <li>Upvote what you want made.</li>
              <li>Every week, top picks get answered in a FaZe upload.</li>
              <li>If it gets made, the author gets +500 points and every backer gets +50.</li>
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-semibold ${
        active ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
