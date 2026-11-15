"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";

const REASON_LABEL: Record<string, string> = {
  clip_vote: "Judged a matchup",
  bracket_vote: "Voted in the bracket",
  post: "Posted to The Call",
  poll_vote: "Voted in a poll",
  upvote_received: "Your post got an upvote",
  upvote_removed: "An upvote was removed",
  backed_fulfilled: "A request you backed got made",
  request_fulfilled: "Your idea got made",
  scout: "Scout: backed the champion early",
  bracket_champion: "Bracket champion",
};

type LedgerRow = Pick<Tables<"points_ledger">, "id" | "amount" | "reason" | "created_at">;

export function ProfileView() {
  const { ready, profile, isGuest, error, connectDiscord, signOut } = useAuth();
  const authError = useSearchParams().get("auth_error");
  const [history, setHistory] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSupabase()
      .from("points_ledger")
      .select("id, amount, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data }) => setHistory(data ?? []));
  }, [profile]);

  if (!ready || !profile) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface" />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <section className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <div className="display flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-2xl text-faze">
              {profile.username.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-lg font-bold">{profile.display_name ?? profile.username}</p>
            <p className="text-sm text-muted">@{profile.username}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted">Points</p>
          <p className="display text-6xl text-gold tabular-nums">{profile.points.toLocaleString()}</p>
        </div>

        {(authError || error) && (
          <p className="mt-4 rounded-md border border-faze/40 bg-faze/10 px-3 py-2 text-sm">
            {authError ?? error}
          </p>
        )}

        {isGuest ? (
          <div className="mt-6 rounded-lg border border-line bg-surface-2 p-4">
            <p className="font-bold">You&apos;re playing as a guest</p>
            <p className="mt-1 text-sm text-muted">
              Connect Discord to keep your points and use them on any device.
            </p>
            <button
              type="button"
              onClick={() => connectDiscord("/me")}
              className="mt-4 w-full rounded-md bg-[#5865F2] px-4 py-2.5 font-bold text-white transition-opacity hover:opacity-90"
            >
              Save progress with Discord
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={signOut}
            className="mt-6 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Sign out
          </button>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="display text-2xl">Points history</h2>
        {history === null ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-surface-2" />
        ) : history.length === 0 ? (
          <p className="mt-4 text-muted">
            Nothing yet. Judge a matchup in Clip Court or back a request in The Call to start
            earning.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <span>{REASON_LABEL[h.reason] ?? h.reason}</span>
                <span
                  className={`font-bold tabular-nums ${h.amount >= 0 ? "text-gold" : "text-muted"}`}
                >
                  {h.amount > 0 ? "+" : ""}
                  {h.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
