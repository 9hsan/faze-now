"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import {
  CATEGORIES,
  categoryLabel,
  clipAuthor,
  friendlyError,
  requiredWatchSeconds,
  type Clip,
} from "@/lib/clips";
import { ClipPlayer } from "./clip-player";

type Result = { winner: string; deltaA: number; deltaB: number; points: number };

export function Judge() {
  const { ready, refreshProfile } = useAuth();
  const supabase = getSupabase();

  const [category, setCategory] = useState<string | null>(null);
  const [pair, setPair] = useState<[Clip, Clip] | null>(null);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [watched, setWatched] = useState({ A: 0, B: 0 });
  const [active, setActive] = useState<"A" | "B">("A");
  const [muted, setMuted] = useState(true);
  const [voting, setVoting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [judged, setJudged] = useState(0);
  const touchX = useRef<number | null>(null);
  /** Bumping this fetches a fresh matchup. */
  const [nonce, setNonce] = useState(0);

  const load = useCallback(() => {
    setStatus("loading");
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let stale = false;

    (async () => {
      const { data, error: rpcError } = await supabase.rpc("next_matchup", {
        p_category: category ?? undefined,
      });
      let ownerMap: Record<string, string> = {};
      if (!rpcError && data && data.length >= 2) {
        const ownerIds = data.slice(0, 2).map((c) => c.owner_id).filter((id): id is string => !!id);
        if (ownerIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ownerIds);
          ownerMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.username]));
        }
      }
      return { data, rpcError, ownerMap };
    })().then(({ data, rpcError, ownerMap }) => {
      if (stale) return;
      setResult(null);
      setWatched({ A: 0, B: 0 });
      setActive("A");
      if (rpcError) {
        setError(friendlyError(rpcError.message));
        setStatus("error");
        return;
      }
      setError(null);
      if (!data || data.length < 2) {
        setPair(null);
        setStatus("empty");
        return;
      }
      setPair([data[0], data[1]]);
      setOwners((o) => ({ ...o, ...ownerMap }));
      setStatus("ready");
    });

    return () => {
      stale = true;
    };
  }, [ready, supabase, category, nonce]);

  const reqA = requiredWatchSeconds(pair?.[0].duration_s);
  const reqB = requiredWatchSeconds(pair?.[1].duration_s);
  const canVote = !!pair && watched.A >= reqA && watched.B >= reqB && !voting && !result;

  const addWatch = useCallback(
    (side: "A" | "B", secs: number) => {
      setWatched((w) => {
        const nextW = { ...w, [side]: w[side] + secs };
        // Once A is watched enough, hand over to B automatically (once)
        if (side === "A" && w.A < reqA && nextW.A >= reqA && nextW.B < reqB) {
          setActive("B");
        }
        return nextW;
      });
    },
    [reqA, reqB],
  );

  const vote = useCallback(
    async (side: "A" | "B") => {
      if (!pair || !canVote) return;
      setVoting(true);
      setError(null);
      const [a, b] = pair;
      const winner = side === "A" ? a.id : b.id;
      const { data, error: rpcError } = await supabase.rpc("cast_clip_vote", {
        p_clip_a: a.id,
        p_clip_b: b.id,
        p_winner: winner,
        p_watched_a: Math.floor(watched.A),
        p_watched_b: Math.floor(watched.B),
      });
      setVoting(false);
      if (rpcError) {
        setError(friendlyError(rpcError.message));
        return;
      }
      const r = data as { rating_a: number; rating_b: number; points: number };
      setResult({
        winner,
        deltaA: Math.round(r.rating_a - a.rating),
        deltaB: Math.round(r.rating_b - b.rating),
        points: r.points,
      });
      setJudged((n) => n + 1);
      refreshProfile();
    },
    [pair, canVote, supabase, watched, refreshProfile],
  );

  // Keyboard: ← votes A, → votes B, Tab-free switching with A/B keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") vote("A");
      else if (e.key === "ArrowRight") vote("B");
      else if (e.key.toLowerCase() === "a") setActive("A");
      else if (e.key.toLowerCase() === "b") setActive("B");
      else if (e.key === "Enter" && result) load();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vote, result, load]);

  const highlight = (side: "A" | "B") => {
    if (!result || !pair) return null;
    const id = side === "A" ? pair[0].id : pair[1].id;
    return id === result.winner ? "win" : "lose";
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip
          active={category === null}
          onClick={() => {
            setStatus("loading");
            setCategory(null);
          }}
        >
          All
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={category === c.id}
            onClick={() => {
              setStatus("loading");
              setCategory(c.id);
            }}
          >
            {c.label}
          </FilterChip>
        ))}
        <span className="ml-auto text-sm text-muted">
          {judged > 0 ? `${judged} judged this session` : "Watch both, then pick the better clip"}
        </span>
      </div>

      {status === "loading" && <div className="h-[60vh] animate-pulse rounded-xl bg-surface" />}

      {status === "error" && (
        <EmptyCard title="Couldn't load a matchup" body={error ?? ""} action={<RetryButton onClick={load} />} />
      )}

      {status === "empty" && (
        <EmptyCard
          title={category ? `No more ${categoryLabel(category)} matchups` : "You've judged every matchup"}
          body="New clips land all the time. Check the leaderboard, or submit a clip of your own."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/court/leaderboard" className="rounded-md bg-faze px-4 py-2 font-bold text-white">
                Leaderboard
              </Link>
              <Link href="/court/submit" className="rounded-md border border-line px-4 py-2 font-bold">
                Submit a clip
              </Link>
            </div>
          }
        />
      )}

      {status === "ready" && pair && (
        <>
          <p className="mb-3 text-center text-sm text-muted">{categoryLabel(pair[0].category)}</p>

          {/* Phone: one clip at a time, swipe or tap to switch */}
          <div className="mb-3 grid grid-cols-2 gap-2 md:hidden">
            {(["A", "B"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActive(s)}
                className={`rounded-md border py-2 text-sm font-bold ${
                  active === s ? "border-faze bg-faze/15" : "border-line text-muted"
                }`}
              >
                Clip {s} {watched[s] >= (s === "A" ? reqA : reqB) ? "✓" : ""}
              </button>
            ))}
          </div>

          <div
            className="grid gap-4 md:grid-cols-2"
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 60) setActive(dx < 0 ? "B" : "A");
            }}
          >
            {(["A", "B"] as const).map((s, i) => (
              <div key={s} className={active === s ? "block" : "hidden md:block"}>
                <ClipPlayer
                  clip={pair[i]}
                  side={s}
                  active={active === s && !result}
                  muted={muted}
                  watched={watched[s]}
                  required={s === "A" ? reqA : reqB}
                  highlight={highlight(s)}
                  onWatch={(secs) => addWatch(s, secs)}
                  onActivate={() => setActive(s)}
                  author={clipAuthor(pair[i], pair[i].owner_id ? owners[pair[i].owner_id] : null)}
                />
              </div>
            ))}
          </div>

          <div className="sticky bottom-16 z-30 mt-4 rounded-xl border border-line bg-bg/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
            {result ? (
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
                <p>
                  <span className="display text-2xl text-gold">+{result.points} pts</span>{" "}
                  <span className="text-muted">
                    · A {fmtDelta(result.deltaA)} · B {fmtDelta(result.deltaB)} rating
                  </span>
                </p>
                <button
                  type="button"
                  onClick={load}
                  className="w-full rounded-md bg-faze px-6 py-3 font-bold text-white hover:bg-faze-hot sm:w-auto"
                  autoFocus
                >
                  Next matchup →
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <VoteButton side="A" disabled={!canVote} onClick={() => vote("A")} />
                  <VoteButton side="B" disabled={!canVote} onClick={() => vote("B")} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>
                    {canVote
                      ? "Pick the better clip  ·  ← / → on keyboard"
                      : voting
                        ? "Counting your vote…"
                        : "Watch both clips to unlock your vote"}
                  </span>
                  <span className="flex gap-3">
                    <button type="button" onClick={() => setMuted((m) => !m)} className="hover:text-fg">
                      {muted ? "Sound on" : "Mute"}
                    </button>
                    <button type="button" onClick={load} className="hover:text-fg">
                      Skip
                    </button>
                  </span>
                </div>
              </>
            )}
            {error && <p className="mt-2 text-center text-sm text-faze-hot">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function fmtDelta(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

function VoteButton({ side, disabled, onClick }: { side: "A" | "B"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="display rounded-lg bg-faze py-3.5 text-2xl text-white transition-all hover:bg-faze-hot disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
    >
      {side} wins
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function EmptyCard({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
      <h2 className="display text-3xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md bg-faze px-4 py-2 font-bold text-white">
      Try again
    </button>
  );
}
