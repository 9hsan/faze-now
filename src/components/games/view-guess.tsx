"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import { parseYouTubeId, youtubeThumb } from "@/lib/call";
import type { Tables } from "@/lib/database.types";

type Round = Tables<"view_rounds">;
type Result = { rank: number; username: string; guess: number; off_by: number; points: number };

const PAYOUTS = [
  ["1st", "1,000"],
  ["2nd", "500"],
  ["3rd", "300"],
  ["4th–10th", "100"],
];

/** "2.5m" -> 2_500_000, "800k" -> 800_000, "1,234,567" -> 1234567 */
export function parseViews(input: string) {
  const s = input.trim().toLowerCase().replace(/[,\s]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const mult = m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : m[2] === "b" ? 1e9 : 1;
  const n = Math.round(Number(m[1]) * mult);
  return n > 0 && n < 1e10 ? n : null;
}

export function fmtViews(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function useCountdown(iso: string | undefined) {
  // Clock starts in the browser only (prerendering can't read the current time)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (!iso || now === null) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s % 60}s`;
}

export function ViewGuess() {
  const { ready, profile, refreshProfile } = useAuth();
  const supabase = getSupabase();
  const [round, setRound] = useState<Round | null | undefined>(undefined);
  const [myGuess, setMyGuess] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const countdown = useCountdown(round?.locks_at);

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    (async () => {
      // Latest open round, else the most recently resolved one
      const { data: rounds } = await supabase
        .from("view_rounds")
        .select("*")
        .order("status", { ascending: true }) // 'open' < 'resolved'
        .order("created_at", { ascending: false })
        .limit(1);
      const r = rounds?.[0] ?? null;
      if (!r) return { r, mine: null, n: 0, res: [] as Result[] };
      const [{ data: mine }, { data: stats }, { data: res }] = await Promise.all([
        profile
          ? supabase.from("view_guesses").select("guess").eq("round_id", r.id).eq("user_id", profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.rpc("view_round_stats", { p_round: r.id }),
        r.status === "resolved"
          ? supabase.rpc("view_round_results", { p_round: r.id })
          : Promise.resolve({ data: [] }),
      ]);
      return {
        r,
        mine: mine?.guess ?? null,
        n: (stats as { guesses: number } | null)?.guesses ?? 0,
        res: (res as Result[] | null) ?? [],
      };
    })().then(({ r, mine, n, res }) => {
      if (stale) return;
      setRound(r);
      setMyGuess(mine);
      setCount(n);
      setResults(res);
    });
    return () => {
      stale = true;
    };
  }, [ready, supabase, profile, nonce]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!round) return;
    const n = parseViews(input);
    if (!n) return setError("Enter a number like 2.5M, 800K or 1,200,000");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("view_guesses").insert({ round_id: round.id, guess: n });
    setBusy(false);
    if (err) return setError(err.code === "23505" ? "You already locked in a guess." : friendlyError(err.message));
    setMyGuess(n);
    setCount((c) => c + 1);
    setInput("");
  }

  if (round === undefined) return <div className="h-80 animate-pulse rounded-2xl bg-surface" />;
  if (round === null) {
    return (
      <GameShell title="Guess the Views" tag="Next drop">
        <p className="text-muted">No round open right now. The next one opens before FaZe&apos;s next upload.</p>
      </GameShell>
    );
  }

  const open = round.status === "open" && countdown !== "closed";
  const preview = parseViews(input);
  const mine = profile ? results.find((r) => r.username === profile.username) : undefined;

  return (
    <GameShell title="Guess the Views" tag={round.status === "resolved" ? "Results" : "Next drop"}>
      <div className="flex gap-4">
        {round.video_id ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={youtubeThumb(round.video_id)} alt="" className="h-20 w-36 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-36 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-faze to-black">
            <span className="display text-3xl text-white">?</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold leading-snug">{round.title}</p>
          <p className="mt-1 text-sm text-muted">
            {round.status === "resolved"
              ? `Final: ${round.final_views?.toLocaleString()} views after 7 days`
              : "How many views will it have 7 days after it drops?"}
          </p>
          <p className="mt-1 text-xs text-muted">{count.toLocaleString()} fans guessed</p>
        </div>
      </div>

      {round.status === "resolved" ? (
        <div className="mt-5">
          {mine && (
            <p className="mb-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm">
              You placed <span className="font-bold">#{mine.rank}</span>, off by {fmtViews(mine.off_by)}
              {mine.points ? ` · +${mine.points} pts` : ""}
            </p>
          )}
          <ol className="divide-y divide-line rounded-lg border border-line">
            {results.slice(0, 5).map((r) => (
              <li key={r.rank} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  <span className="display mr-2 text-lg text-muted">{r.rank}</span>@{r.username}
                </span>
                <span className="tabular-nums text-muted">
                  {fmtViews(r.guess)} · <span className="font-bold text-gold">+{r.points}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : myGuess ? (
        <div className="mt-5 rounded-xl border border-line bg-bg p-4 text-center">
          <p className="text-sm text-muted">Your guess is locked in</p>
          <p className="display mt-1 text-5xl text-gold">{fmtViews(myGuess)}</p>
          <p className="mt-2 text-xs text-muted">Results 7 days after the drop. Closest 10 win points.</p>
        </div>
      ) : open ? (
        <form onSubmit={submit} className="mt-5">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 2.5M"
              aria-label="Your view count guess"
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-3 text-lg font-bold outline-none focus:border-faze"
            />
            <button
              type="submit"
              disabled={busy || !preview || !ready}
              className="rounded-lg bg-faze px-5 font-bold text-white hover:bg-faze-hot disabled:bg-surface-2 disabled:text-muted"
            >
              Lock it
            </button>
          </div>
          <p className="mt-1.5 h-4 text-xs text-muted">{preview ? `= ${preview.toLocaleString()} views` : ""}</p>
          {error && <p className="text-sm text-faze-hot">{error}</p>}
        </form>
      ) : (
        <p className="mt-5 text-sm text-muted">Guessing closed. Results land 7 days after the drop.</p>
      )}

      {round.status === "open" && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <ul className="flex gap-3 text-xs">
            {PAYOUTS.map(([place, p]) => (
              <li key={place}>
                <span className="text-muted">{place}</span> <span className="font-bold text-gold">{p}</span>
              </li>
            ))}
          </ul>
          <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs tabular-nums">
            {open ? `⏱ ${countdown}` : "Closed"}
          </span>
        </div>
      )}

      {profile?.is_admin && round.status === "open" && <ResolveForm round={round} onDone={() => { setNonce((n) => n + 1); refreshProfile(); }} />}
    </GameShell>
  );
}

function ResolveForm({ round, onDone }: { round: Round; onDone: () => void }) {
  const [views, setViews] = useState("");
  const [video, setVideo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="mt-4 grid gap-2 border-t border-dashed border-faze/50 pt-3 text-xs"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = parseViews(views);
        if (!n) return setMsg("Enter the final view count");
        const { data, error } = await getSupabase().rpc("resolve_view_round", {
          p_round: round.id,
          p_final_views: n,
          p_video_id: parseYouTubeId(video) ?? undefined,
        });
        if (error) return setMsg(friendlyError(error.message));
        setMsg(`Resolved. Paid ${(data as { winners_paid: number }).winners_paid} winners.`);
        onDone();
      }}
    >
      <span className="font-bold uppercase tracking-wider text-faze">Admin · resolve round</span>
      <div className="flex gap-2">
        <input value={views} onChange={(e) => setViews(e.target.value)} placeholder="Final views (e.g. 2.9M)" className="flex-1 rounded border border-line bg-bg px-2 py-1.5" />
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="YouTube link (optional)" className="flex-1 rounded border border-line bg-bg px-2 py-1.5" />
        <button type="submit" className="rounded bg-emerald-500 px-3 font-bold text-black">Resolve</button>
      </div>
      {msg && <p className="text-muted">{msg}</p>}
    </form>
  );
}

export function GameShell({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="display text-3xl">{title}</h3>
        <span className="rounded-full border border-faze/50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-faze-hot">
          {tag}
        </span>
      </div>
      {children}
    </section>
  );
}
