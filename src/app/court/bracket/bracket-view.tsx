"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import {
  CATEGORIES,
  categoryLabel,
  clipThumbUrl,
  clipVideoUrl,
  friendlyError,
  type CategoryId,
  type Clip,
} from "@/lib/clips";
import type { Tables } from "@/lib/database.types";

type Bracket = Tables<"brackets">;
type Match = Tables<"bracket_matches"> & { a: Clip | null; b: Clip | null };

function roundName(round: number, size: number) {
  const remaining = size / 2 ** (round - 1);
  if (remaining === 2) return "Final";
  if (remaining === 4) return "Semifinals";
  if (remaining === 8) return "Quarterfinals";
  return `Round of ${remaining}`;
}

export function BracketView() {
  const { ready, profile, refreshProfile } = useAuth();
  const supabase = getSupabase();
  const [brackets, setBrackets] = useState<Bracket[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<Clip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Pure fetchers (no state); effects and handlers apply their results.
  const fetchBrackets = useCallback(async () => {
    const { data } = await supabase.from("brackets").select("*").order("created_at", { ascending: false });
    return data ?? [];
  }, [supabase]);

  const fetchMatches = useCallback(
    async (bracketId: string) => {
      const { data } = await supabase
        .from("bracket_matches")
        .select("*, a:clips!bracket_matches_clip_a_fkey(*), b:clips!bracket_matches_clip_b_fkey(*)")
        .eq("bracket_id", bracketId)
        .order("round")
        .order("slot");
      const rows = (data as Match[] | null) ?? [];
      let votes: Record<string, string> = {};
      if (profile && rows.length) {
        const { data: v } = await supabase
          .from("bracket_votes")
          .select("match_id, choice")
          .eq("user_id", profile.id)
          .in(
            "match_id",
            rows.map((m) => m.id),
          );
        votes = Object.fromEntries((v ?? []).map((x) => [x.match_id, x.choice]));
      }
      return { rows, votes };
    },
    [supabase, profile],
  );

  const applyBrackets = useCallback((list: Bracket[]) => {
    setBrackets(list);
    setSelected((cur) => cur ?? list.find((b) => b.status === "active")?.id ?? list[0]?.id ?? null);
  }, []);

  const applyMatches = useCallback(({ rows, votes }: { rows: Match[]; votes: Record<string, string> }) => {
    setMatches(rows);
    setMyVotes(votes);
  }, []);

  const loadBrackets = useCallback(async () => applyBrackets(await fetchBrackets()), [fetchBrackets, applyBrackets]);
  const loadMatches = useCallback(
    async (bracketId: string) => applyMatches(await fetchMatches(bracketId)),
    [fetchMatches, applyMatches],
  );

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    fetchBrackets().then((list) => !stale && applyBrackets(list));
    return () => {
      stale = true;
    };
  }, [ready, fetchBrackets, applyBrackets]);

  useEffect(() => {
    if (!selected) return;
    let stale = false;
    fetchMatches(selected).then((r) => !stale && applyMatches(r));

    // Live vote counts and new rounds
    const channel = supabase
      .channel(`bracket-${selected}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bracket_matches", filter: `bracket_id=eq.${selected}` },
        (payload) => {
          const row = payload.new as Tables<"bracket_matches">;
          setMatches((ms) => ms.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bracket_matches", filter: `bracket_id=eq.${selected}` },
        () => {
          loadMatches(selected);
          loadBrackets();
        },
      )
      .subscribe();
    return () => {
      stale = true;
      supabase.removeChannel(channel);
    };
  }, [selected, supabase, fetchMatches, applyMatches, loadMatches, loadBrackets]);

  const bracket = brackets?.find((b) => b.id === selected) ?? null;
  const rounds = useMemo(() => {
    const byRound = new Map<number, Match[]>();
    for (const m of matches) byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
    return [...byRound.entries()].sort((x, y) => x[0] - y[0]);
  }, [matches]);
  const championClip = bracket?.champion_id
    ? (matches.flatMap((m) => [m.a, m.b]).find((c) => c?.id === bracket.champion_id) ?? null)
    : null;

  async function vote(match: Match, clipId: string) {
    setError(null);
    setBusy(match.id);
    const { error: e } = await supabase.from("bracket_votes").insert({ match_id: match.id, choice: clipId });
    setBusy(null);
    if (e) {
      setError(e.code === "23505" ? "You already voted in this match." : friendlyError(e.message));
      return;
    }
    setMyVotes((v) => ({ ...v, [match.id]: clipId }));
    refreshProfile();
  }

  if (!brackets) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;

  return (
    <div className="grid gap-6">
      {brackets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {brackets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelected(b.id)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                selected === b.id ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"
              }`}
            >
              {b.title}
              {b.status === "complete" ? " ✓" : ""}
            </button>
          ))}
        </div>
      )}

      {!bracket ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <h2 className="display text-3xl">No bracket yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            The top-rated clips from Clip Court get seeded into a bracket. Keep judging to decide who
            makes it.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">
                {categoryLabel(bracket.category)} · Season {bracket.season}
              </p>
              <h2 className="display mt-1 text-4xl">{bracket.title}</h2>
            </div>
            {bracket.status === "active" && (
              <p className="max-w-sm text-sm text-muted">
                <span className="font-bold text-gold">Scout bonus:</span> back the eventual champion in
                round 1 and earn +100 points when they win.
              </p>
            )}
          </div>

          {championClip && (
            <div className="flex items-center gap-4 rounded-xl border border-gold bg-gold/10 p-4">
              <span className="display text-5xl text-gold">#1</span>
              <div>
                <p className="eyebrow !text-gold">Champion</p>
                <p className="text-xl font-bold">{championClip.title}</p>
                <p className="text-sm text-muted">
                  {championClip.creator_label ?? "Community clip"} plays with a FaZe creator in the season
                  finale video.
                </p>
              </div>
            </div>
          )}

          {error && <p className="rounded-md border border-faze/40 bg-faze/10 px-3 py-2 text-sm">{error}</p>}

          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex min-w-max gap-5">
              {rounds.map(([round, ms]) => (
                <section key={round} className="w-[300px] shrink-0">
                  <h3 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wider">
                    <span>{roundName(round, bracket.size)}</span>
                    {round === bracket.current_round && bracket.status === "active" && (
                      <span className="rounded bg-faze px-2 py-0.5 text-[10px] text-white">Voting open</span>
                    )}
                  </h3>
                  <div className="flex h-full flex-col justify-around gap-4">
                    {ms.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        myVote={myVotes[m.id]}
                        busy={busy === m.id}
                        onVote={(clipId) => vote(m, clipId)}
                        onPlay={setPlaying}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      {profile?.is_admin && (
        <AdminPanel
          bracket={bracket}
          onChanged={async (newId) => {
            if (newId) setSelected(newId);
            await loadBrackets();
            if (newId ?? selected) await loadMatches((newId ?? selected)!);
          }}
        />
      )}

      {playing && <PlayerModal clip={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function MatchCard({
  match,
  myVote,
  busy,
  onVote,
  onPlay,
}: {
  match: Match;
  myVote?: string;
  busy: boolean;
  onVote: (clipId: string) => void;
  onPlay: (clip: Clip) => void;
}) {
  const total = match.votes_a + match.votes_b;
  const showCounts = !!myVote || match.status === "closed";
  const open = match.status === "open";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {(["a", "b"] as const).map((key) => {
        const clip = match[key];
        if (!clip) return null;
        const votes = key === "a" ? match.votes_a : match.votes_b;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const isWinner = match.winner_id === clip.id;
        const isLoser = !!match.winner_id && !isWinner;
        const mine = myVote === clip.id;
        const thumb = clipThumbUrl(clip);

        return (
          <div
            key={key}
            className={`relative flex items-center gap-3 border-b border-line p-2.5 last:border-b-0 ${
              isLoser ? "opacity-45" : ""
            }`}
          >
            {showCounts && (
              <div
                className={`absolute inset-y-0 left-0 ${isWinner ? "bg-gold/15" : "bg-faze/10"}`}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => onPlay(clip)}
              className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-surface-2"
              aria-label={`Play ${clip.title}`}
            >
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs">▶</span>
            </button>
            <div className="relative min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {isWinner && <span className="text-gold">✓ </span>}
                {clip.title}
              </p>
              <p className="text-xs text-muted">
                {showCounts ? `${votes} votes · ${pct}%` : clip.creator_label ?? "Community clip"}
                {mine ? " · your pick" : ""}
              </p>
            </div>
            {open && !myVote && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onVote(clip.id)}
                className="relative shrink-0 rounded-md bg-faze px-3 py-1.5 text-xs font-bold text-white hover:bg-faze-hot disabled:opacity-50"
              >
                Vote
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerModal({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={clip.title}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <video
          src={clipVideoUrl(clip)}
          poster={clipThumbUrl(clip)}
          className="max-h-[80vh] w-full rounded-xl bg-black"
          controls
          autoPlay
          playsInline
          loop
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="font-bold">{clip.title}</p>
          <button type="button" onClick={onClose} className="text-sm text-muted hover:text-fg">
            Close ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({
  bracket,
  onChanged,
}: {
  bracket: Bracket | null;
  onChanged: (newBracketId?: string) => Promise<void>;
}) {
  const supabase = getSupabase();
  const [category, setCategory] = useState<CategoryId>("trickshot");
  const [size, setSize] = useState(8);
  const [title, setTitle] = useState("Season 1 Trickshot Bracket");
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function create() {
    setWorking(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("create_bracket", {
      p_category: category,
      p_size: size,
      p_title: title,
    });
    setWorking(false);
    if (error) return setMsg(friendlyError(error.message));
    setMsg("Bracket created.");
    await onChanged(data as string);
  }

  async function advance() {
    if (!bracket) return;
    setWorking(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("advance_bracket", { p_bracket: bracket.id });
    setWorking(false);
    if (error) return setMsg(friendlyError(error.message));
    const r = data as { status: string; round?: number };
    setMsg(r.status === "complete" ? "Champion crowned. Scouts paid." : `Round ${r.round} is open.`);
    await onChanged();
  }

  return (
    <section className="rounded-xl border border-dashed border-faze/50 p-4">
      <p className="eyebrow">Admin</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-line bg-surface px-2 py-1.5"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId)}
            className="rounded-md border border-line bg-surface px-2 py-1.5"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Size
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="rounded-md border border-line bg-surface px-2 py-1.5"
          >
            {[4, 8, 16, 32].map((n) => (
              <option key={n} value={n}>
                Top {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={working}
          onClick={create}
          className="rounded-md bg-fg px-3 py-2 text-sm font-bold text-bg disabled:opacity-50"
        >
          Seed bracket
        </button>
      </div>
      {bracket?.status === "active" && (
        <button
          type="button"
          disabled={working}
          onClick={advance}
          className="mt-3 rounded-md bg-faze px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Close {roundName(bracket.current_round, bracket.size)} &amp; advance
        </button>
      )}
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
    </section>
  );
}
