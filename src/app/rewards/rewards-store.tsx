"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/clips";
import type { Tables } from "@/lib/database.types";

type Reward = Tables<"rewards">;
type Redemption = Tables<"redemptions"> & { reward: { title: string } | null };

const KIND: Record<string, { label: string; art: string }> = {
  digital: { label: "Digital", art: "from-sky-500/40 via-indigo-600/30 to-black" },
  merch: { label: "Merch", art: "from-faze/60 via-rose-900/40 to-black" },
  experience: { label: "Experience", art: "from-gold/50 via-amber-700/30 to-black" },
};

export function RewardsStore() {
  const { ready, profile, isGuest, refreshProfile, connectDiscord } = useAuth();
  const supabase = getSupabase();
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [mine, setMine] = useState<Redemption[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ title: string; code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const profileId = profile?.id;

  useEffect(() => {
    if (!ready) return;
    let stale = false;
    Promise.all([
      supabase.from("rewards").select("*").order("sort"),
      profileId
        ? supabase
            .from("redemptions")
            .select("*, reward:rewards(title)")
            .eq("user_id", profileId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]).then(([{ data: r }, { data: m }]) => {
      if (stale) return;
      setRewards(r ?? []);
      setMine((m as Redemption[] | null) ?? []);
    });
    return () => {
      stale = true;
    };
  }, [ready, supabase, profileId, nonce]);

  async function redeem(r: Reward) {
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("redeem_reward", { p_reward: r.id });
    setBusy(false);
    setConfirming(null);
    if (e) return setError(friendlyError(e.message));
    setFlash({ title: r.title, code: (data as { code: string }).code });
    refreshProfile();
    setNonce((n) => n + 1);
  }

  const balance = profile?.points ?? 0;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-gradient-to-br from-surface to-bg p-6">
        <div>
          <p className="text-sm text-muted">Your balance</p>
          <p className="display text-6xl text-gold tabular-nums">{ready ? balance.toLocaleString() : "···"}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/court" className="rounded-full border border-line px-4 py-2 font-semibold hover:border-fg">
            Earn: judge clips
          </Link>
          <Link href="/call" className="rounded-full border border-line px-4 py-2 font-semibold hover:border-fg">
            Earn: back ideas
          </Link>
          <Link href="/#play" className="rounded-full border border-line px-4 py-2 font-semibold hover:border-fg">
            Earn: play games
          </Link>
        </div>
      </div>

      {flash && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4" role="status">
          <p className="font-bold">Redeemed: {flash.title}</p>
          <p className="mt-1 text-sm">
            Your code: <span className="rounded bg-bg px-2 py-0.5 font-mono font-bold">{flash.code}</span>
          </p>
          {isGuest && (
            <p className="mt-2 text-sm text-muted">
              You&apos;re a guest. <button type="button" onClick={() => connectDiscord("/rewards")} className="underline">Connect Discord</button> so we can reach you about it.
            </p>
          )}
        </div>
      )}
      {error && <p className="rounded-md border border-faze/40 bg-faze/10 px-3 py-2 text-sm">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rewards === null
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface" />)
          : rewards.map((r) => {
              const kind = KIND[r.kind] ?? KIND.digital;
              const soldOut = r.stock !== null && r.stock <= 0;
              const afford = balance >= r.cost;
              const pct = Math.min(100, (balance / r.cost) * 100);
              return (
                <article key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className={`relative flex h-32 items-end bg-gradient-to-br p-4 ${kind.art}`}>
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                      {kind.label}
                    </span>
                    {r.stock !== null && (
                      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold">
                        {soldOut ? "Sold out" : `${r.stock} left`}
                      </span>
                    )}
                    <p className="display text-4xl text-white drop-shadow">{r.cost.toLocaleString()}</p>
                    <span className="mb-1 ml-1.5 text-xs font-bold text-white/80">pts</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold leading-snug">{r.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted">{r.description}</p>
                    {!afford && !soldOut && (
                      <div className="mt-3">
                        <div className="h-1.5 rounded bg-surface-2">
                          <div className="h-1.5 rounded bg-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted">{(r.cost - balance).toLocaleString()} more to go</p>
                      </div>
                    )}
                    {confirming === r.id ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => redeem(r)}
                          className="rounded-md bg-faze py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {busy ? "…" : `Spend ${r.cost.toLocaleString()}`}
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="rounded-md border border-line py-2 text-sm">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!afford || soldOut || !ready}
                        onClick={() => setConfirming(r.id)}
                        className="mt-3 rounded-md bg-faze py-2 text-sm font-bold text-white hover:bg-faze-hot disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
                      >
                        {soldOut ? "Sold out" : afford ? "Redeem" : "Not enough points"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
      </div>

      <section>
        <h2 className="display text-3xl">My rewards</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-muted">Nothing redeemed yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {mine.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-semibold">{m.reward?.title ?? "Reward"}</span>
                <span className="flex items-center gap-3 text-muted">
                  <span className="rounded bg-bg px-2 py-0.5 font-mono text-fg">{m.code}</span>
                  <span className="capitalize">{m.status}</span>
                  <span>−{m.cost.toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
