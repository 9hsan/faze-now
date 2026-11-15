"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import type { Tables } from "@/lib/database.types";
import { GameShell } from "./view-guess";

type Member = Tables<"faze_members">;
type Feedback = {
  member: string;
  name: string;
  joined_year: number;
  joined: "exact" | "earlier" | "later";
  era: string;
  era_match: boolean;
  known_for: string;
  known_for_match: boolean;
  founder: boolean;
  founder_match: boolean;
  correct: boolean;
};
type Game = { day: string; guesses: Feedback[]; solved: boolean; max: number; answer: string | null };

const MAX = 6;

export function MemberGuess() {
  const { ready, refreshProfile } = useAuth();
  const supabase = getSupabase();
  const [members, setMembers] = useState<Member[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    Promise.all([supabase.from("faze_members").select("*").order("sort"), supabase.rpc("my_member_game")]).then(
      ([{ data: m }, { data: g, error: e }]) => {
        if (stale) return;
        setMembers(m ?? []);
        if (e) setError(friendlyError(e.message));
        else setGame(g as Game);
      },
    );
    return () => {
      stale = true;
    };
  }, [ready, supabase]);

  async function guess(id: string) {
    if (!game || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("guess_member", { p_member: id });
    setBusy(false);
    if (e) return setError(friendlyError(e.message));
    const fb = data as Feedback & { attempt: number; points: number; answer: string | null };
    setGame((g) =>
      g ? { ...g, guesses: [...g.guesses, fb], solved: fb.correct, answer: fb.answer ?? g.answer } : g,
    );
    if (fb.points) {
      setEarned(fb.points);
      refreshProfile();
    }
  }

  if (!game) {
    return (
      <GameShell title="Guess the Member" tag="Daily">
        {error ? <p className="text-sm text-faze-hot">{error}</p> : <div className="h-64 animate-pulse rounded-xl bg-surface-2" />}
      </GameShell>
    );
  }

  const done = game.solved || game.guesses.length >= MAX;
  const guessed = new Set(game.guesses.map((g) => g.member));

  const shareText = [
    `Faze Now · Guess the Member ${game.day}`,
    `${game.solved ? game.guesses.length : "X"}/${MAX}`,
    ...game.guesses.map((g) =>
      [g.joined === "exact", g.era_match, g.known_for_match, g.founder_match].map((ok) => (ok ? "🟩" : "⬛")).join("") +
      (g.correct ? " 🔴" : ""),
    ),
  ].join("\n");

  return (
    <GameShell title="Guess the Member" tag="Daily">
      <p className="text-sm text-muted">
        One FaZe member a day. Six guesses. Each miss tells you how close you are.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr className="text-left uppercase tracking-wider text-muted">
              <th className="px-1 font-semibold">Member</th>
              <th className="px-1 font-semibold">Joined</th>
              <th className="px-1 font-semibold">Era</th>
              <th className="px-1 font-semibold">Known for</th>
              <th className="px-1 font-semibold">Founder</th>
            </tr>
          </thead>
          <tbody>
            {game.guesses.map((g) => (
              <tr key={g.member}>
                <Cell ok={g.correct} strong>
                  {g.name}
                </Cell>
                <Cell ok={g.joined === "exact"}>
                  {g.joined_year} {g.joined === "earlier" ? "↓" : g.joined === "later" ? "↑" : ""}
                  <span className="sr-only">
                    {g.joined === "exact" ? "exact" : g.joined === "later" ? "answer joined later" : "answer joined earlier"}
                  </span>
                </Cell>
                <Cell ok={g.era_match}>{g.era.replace(" era", "")}</Cell>
                <Cell ok={g.known_for_match}>{g.known_for}</Cell>
                <Cell ok={g.founder_match}>{g.founder ? "Yes" : "No"}</Cell>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, MAX - game.guesses.length) }, (_, i) => (
              <tr key={`empty-${i}`} aria-hidden>
                {Array.from({ length: 5 }, (_, j) => (
                  <td key={j} className="h-9 rounded-md border border-dashed border-line" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-muted">↑ the answer joined later · ↓ joined earlier</p>
      </div>

      {done ? (
        <div className="mt-4 rounded-xl border border-line bg-bg p-4 text-center">
          {game.solved ? (
            <>
              <p className="display text-3xl text-emerald-300">Got it in {game.guesses.length}!</p>
              {earned ? <p className="mt-1 font-bold text-gold">+{earned} pts</p> : null}
            </>
          ) : (
            <p className="display text-2xl">
              It was <span className="text-faze">{game.answer}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-muted">New puzzle at midnight Central.</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="mt-3 rounded-md bg-fg px-4 py-2 text-sm font-bold text-bg"
          >
            {copied ? "Copied ✓" : "Share result"}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">
            Guess {game.guesses.length + 1} of {MAX}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={busy || guessed.has(m.id)}
                onClick={() => guess(m.id)}
                className="rounded-lg border border-line px-2 py-2 text-sm font-semibold transition-colors hover:border-faze hover:bg-faze/10 disabled:opacity-30"
              >
                {m.name.replace(/^FaZe /, "")}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-faze-hot">{error}</p>}
        </div>
      )}
    </GameShell>
  );
}

function Cell({ ok, strong, children }: { ok: boolean; strong?: boolean; children: React.ReactNode }) {
  return (
    <td
      className={`h-9 rounded-md px-2 ${strong ? "font-bold" : ""} ${
        ok ? "bg-emerald-500/20 text-emerald-200" : "bg-surface-2 text-fg"
      }`}
    >
      <span className="mr-1" aria-label={ok ? "match" : "no match"}>
        {ok ? "✓" : "✗"}
      </span>
      {children}
    </td>
  );
}
