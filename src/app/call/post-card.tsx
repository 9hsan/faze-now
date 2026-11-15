"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import {
  STATUS,
  authorLabel,
  currentWeek,
  parseYouTubeId,
  timeAgo,
  youtubeThumb,
  type FeedPost,
} from "@/lib/call";

export type MyVotes = { upvoted: boolean; poll?: "yes" | "no" };

type Props = {
  post: FeedPost;
  mine: MyVotes;
  isAdmin: boolean;
  onUpvote: (post: FeedPost) => void;
  onPollVote: (post: FeedPost, choice: "yes" | "no") => void;
  onAdminChange: (post: FeedPost) => void;
  big?: boolean;
};

export function PostCard({ post, mine, isAdmin, onUpvote, onPollVote, onAdminChange, big }: Props) {
  const status = STATUS[post.status];
  const isPoll = post.type === "poll";
  const pollTotal = post.yes_count + post.no_count;
  const yesPct = pollTotal ? Math.round((post.yes_count / pollTotal) * 100) : 0;
  const showResults = !!mine.poll || post.status === "fulfilled";

  return (
    <article
      className={`flex gap-3 rounded-xl border bg-surface p-4 ${
        post.status === "fulfilled" ? "border-emerald-400/30" : "border-line"
      }`}
    >
      <UpvoteButton count={post.upvote_count} active={mine.upvoted} onClick={() => onUpvote(post)} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${
              isPoll ? "bg-fg/10 text-fg" : "bg-faze/15 text-faze-hot"
            }`}
          >
            {isPoll ? "Poll" : "Request"}
          </span>
          {post.creator_name && <span className="font-bold text-fg">→ {post.creator_name}</span>}
          <span className="text-muted">
            {authorLabel(post)} · {timeAgo(post.created_at)}
          </span>
          {status && (
            <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.className}`}>{status.label}</span>
          )}
        </div>

        <p className={`mt-2 break-words ${big ? "text-xl font-bold" : "text-[15px]"}`}>{post.body}</p>

        {isPoll && (
          <div className="mt-3 grid gap-2">
            {showResults ? (
              <>
                <PollBar label="Yes" pct={yesPct} count={post.yes_count} chosen={mine.poll === "yes"} />
                <PollBar label="No" pct={pollTotal ? 100 - yesPct : 0} count={post.no_count} chosen={mine.poll === "no"} />
                <p className="text-xs text-muted">{pollTotal.toLocaleString()} votes</p>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(["yes", "no"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onPollVote(post, c)}
                    className="rounded-md border border-line py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:border-faze hover:bg-faze/10"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {post.status === "fulfilled" && post.fulfilled_video_id && (
          <a
            href={`https://www.youtube.com/watch?v=${post.fulfilled_video_id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-bg p-2 transition-colors hover:border-emerald-400/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={youtubeThumb(post.fulfilled_video_id)} alt="" className="h-14 w-24 rounded object-cover" />
            <span className="text-sm">
              <span className="font-bold text-emerald-300">It got made.</span>{" "}
              <span className="text-muted">Watch on YouTube →</span>
            </span>
          </a>
        )}

        {isAdmin && <AdminBar post={post} onChange={onAdminChange} />}
      </div>
    </article>
  );
}

function UpvoteButton({ count, active, onClick }: { count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Remove upvote" : "Upvote"}
      className={`flex h-fit w-12 shrink-0 flex-col items-center rounded-lg border py-2 transition-colors ${
        active ? "border-faze bg-faze/15 text-faze-hot" : "border-line text-muted hover:border-fg hover:text-fg"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 4 3 15h6v5h6v-5h6z" />
      </svg>
      <span className="mt-0.5 text-sm font-bold tabular-nums">{compact(count)}</span>
    </button>
  );
}

function PollBar({ label, pct, count, chosen }: { label: string; pct: number; count: number; chosen: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-bg">
      <div
        className={`absolute inset-y-0 left-0 ${chosen ? "bg-faze/30" : "bg-fg/10"}`}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex justify-between px-3 py-1.5 text-sm">
        <span className="font-bold">
          {label}
          {chosen ? " · your vote" : ""}
        </span>
        <span className="tabular-nums text-muted">
          {pct}% · {count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

function AdminBar({ post, onChange }: { post: FeedPost; onChange: (p: FeedPost) => void }) {
  const supabase = getSupabase();
  const [fulfilling, setFulfilling] = useState(false);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const week = currentWeek();
  const featured = post.featured_week === week;

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, patch: Partial<FeedPost>, ok: string) {
    setMsg(null);
    const { error } = await fn();
    if (error) return setMsg(friendlyError(error.message));
    setMsg(ok);
    onChange({ ...post, ...patch });
  }

  const btn = "rounded border border-line px-2 py-1 hover:border-fg disabled:opacity-40";

  return (
    <div className="mt-3 border-t border-dashed border-line pt-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold uppercase tracking-wider text-faze">Admin</span>
        <button
          type="button"
          className={btn}
          disabled={post.status === "seen" || post.status === "fulfilled"}
          onClick={() => act(() => supabase.rpc("set_post_status", { p_post: post.id, p_status: "seen" }), { status: "seen" }, "Marked seen. Author notified.")}
        >
          Seen
        </button>
        <button
          type="button"
          className={btn}
          disabled={post.status === "considering" || post.status === "fulfilled"}
          onClick={() =>
            act(() => supabase.rpc("set_post_status", { p_post: post.id, p_status: "considering" }), { status: "considering" }, "Under consideration. Author notified.")
          }
        >
          Considering
        </button>
        <button type="button" className={btn} disabled={post.status === "fulfilled"} onClick={() => setFulfilling((f) => !f)}>
          Fulfill…
        </button>
        <button
          type="button"
          className={btn}
          onClick={() =>
            act(
              // SQL accepts null to clear the pick; the generated type only knows string
              () => supabase.rpc("set_featured", { p_post: post.id, p_week: (featured ? null : week) as string }),
              { featured_week: featured ? null : week },
              featured ? "Removed from this week." : "Featured for this week's upload.",
            )
          }
        >
          {featured ? "Unfeature" : "Feature this week"}
        </button>
        <button
          type="button"
          className={`${btn} text-faze-hot`}
          onClick={() => act(() => supabase.rpc("set_post_status", { p_post: post.id, p_status: "removed" }), { status: "removed" }, "Removed.")}
        >
          Remove
        </button>
      </div>
      {fulfilling && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = parseYouTubeId(url);
            if (!id) return setMsg("Paste a YouTube link or video id.");
            setFulfilling(false);
            act(
              () => supabase.rpc("fulfill_post", { p_post: post.id, p_video_id: id }),
              { status: "fulfilled", fulfilled_video_id: id, fulfilled_at: new Date().toISOString() },
              "Fulfilled. Author +500, every backer +50, everyone notified.",
            );
          }}
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube link of the video that answered it"
            className="flex-1 rounded border border-line bg-bg px-2 py-1"
          />
          <button type="submit" className="rounded bg-emerald-500 px-2 py-1 font-bold text-black">
            Fulfill
          </button>
        </form>
      )}
      {msg && <p className="mt-1 text-muted">{msg}</p>}
    </div>
  );
}
