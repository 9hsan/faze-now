"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { clipThumbUrl, type Clip } from "@/lib/clips";

function useTopThumbs(n: number) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  useEffect(() => {
    getSupabase()
      .from("clips")
      .select("thumb_path")
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(n)
      .then(({ data }) =>
        setThumbs((data ?? []).map((c) => clipThumbUrl(c as Pick<Clip, "thumb_path">)).filter((u): u is string => !!u)),
      );
  }, [n]);
  return thumbs;
}

export function Benefits() {
  const thumbs = useTopThumbs(3);
  return (
    <section className="py-20">
      <div className="text-center">
        <h2 className="display text-6xl md:text-8xl">
          The fan <span className="text-faze">club</span>
        </h2>
        <p className="mt-3 text-muted">Free to join. Rewarded for showing up.</p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <BenefitCard title="Pitch" body="Post requests and polls. Top ideas get answered in FaZe uploads." href="/call">
          <div className="flex h-full flex-col justify-center bg-gradient-to-br from-faze/50 to-black p-5">
            <span className="display text-6xl leading-none text-white/90">“</span>
            <p className="-mt-3 text-lg font-bold leading-snug text-white">Swagg, drop a nuke in every COD ever made</p>
            <p className="mt-2 text-xs font-bold text-white/70">▲ 412 votes</p>
          </div>
        </BenefitCard>

        <BenefitCard title="Judge" body="Pick the better of two clips. Every submission gets seen." href="/court">
          <div className="grid h-full grid-cols-2 gap-1 bg-black p-1">
            {[0, 1].map((i) => (
              <div key={i} className="relative overflow-hidden rounded-lg bg-surface-2">
                {thumbs[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[i]} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
                <span className="display absolute left-2 top-2 rounded bg-black/70 px-1.5 text-lg">{i ? "B" : "A"}</span>
              </div>
            ))}
            <span className="display absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-faze px-3 py-1 text-xl text-white">
              VS
            </span>
          </div>
        </BenefitCard>

        <BenefitCard title="Play" body="Guess the views on the next drop. Solve the daily member puzzle." href="/#play">
          <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-emerald-900/50 to-black">
            {[
              [1, 0, 0, 1],
              [1, 1, 0, 1],
              [1, 1, 1, 1],
            ].map((row, r) => (
              <div key={r} className="flex gap-1.5">
                {row.map((ok, c) => (
                  <span key={c} className={`h-9 w-9 rounded-md ${ok ? "bg-emerald-500/80" : "bg-white/15"}`} />
                ))}
              </div>
            ))}
            <span className="display mt-2 text-2xl text-white">3/6 · +40</span>
          </div>
        </BenefitCard>

        <BenefitCard title="Earn" body="Spend points on merch, early drops and moments inside FaZe videos." href="/rewards">
          <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-gold/40 to-black">
            <span className="display text-7xl text-gold">25,000</span>
            <span className="mt-1 text-sm font-bold text-white/80">= a day at FaZe</span>
          </div>
        </BenefitCard>
      </div>
    </section>
  );
}

function BenefitCard({ title, body, href, children }: { title: string; body: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-faze">
        {children}
      </div>
      <h3 className="mt-4 text-center text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-[18rem] text-center text-sm text-muted">{body}</p>
    </Link>
  );
}

export function Bands() {
  const thumbs = useTopThumbs(6);
  const rows = [
    { href: "/call", title: "The Call", sub: "Fans pitch it. FaZe hears it.", art: "from-faze/70 via-rose-950 to-black", word: "PITCH" },
    { href: "/court", title: "Clip Court", sub: "Every clip gets seen.", art: "from-black via-black/60 to-transparent", word: "JUDGE", strip: true },
    { href: "/creators", title: "Creator Insights", sub: "What fans actually want, by creator.", art: "from-sky-900 via-slate-950 to-black", word: "INSIGHTS" },
    { href: "/rewards", title: "Rewards", sub: "Merch, early drops, moments in FaZe videos.", art: "from-amber-700/70 via-stone-950 to-black", word: "EARN" },
  ];
  return (
    <section className="bleed border-t border-line">
      {rows.map((r) => (
        <Link
          key={r.href}
          href={r.href}
          className="group relative flex h-36 items-center overflow-hidden border-b border-line md:h-44"
        >
          {r.strip && thumbs.length > 0 && (
            <div className="absolute inset-0 flex opacity-60 transition-opacity group-hover:opacity-80" aria-hidden>
              {thumbs.map((t, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={t} alt="" className="h-full flex-1 object-cover" loading="lazy" />
              ))}
            </div>
          )}
          <div className={`absolute inset-0 bg-gradient-to-r ${r.art}`} />
          <span
            className="display outline-text pointer-events-none absolute right-24 top-1/2 -translate-y-1/2 select-none text-[9rem] leading-none transition-transform duration-500 group-hover:-translate-x-4 md:text-[12rem]"
            aria-hidden
          >
            {r.word}
          </span>
          <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4">
            <div>
              <h3 className="display text-4xl md:text-6xl">{r.title}</h3>
              <p className="mt-1 text-sm text-fg/70 md:text-base">{r.sub}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition-transform group-hover:translate-x-1">
              Enter <span aria-hidden>›</span>
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="bleed relative overflow-hidden py-24 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(228,0,43,0.25),transparent_65%)]" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-4">
        <p className="eyebrow">Kingmakers since 2010</p>
        <h2 className="display mt-3 text-7xl md:text-9xl">Your turn.</h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          No sign-up to start. Your points are saved as you go. Connect Discord to keep them on any device.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/court" className="rounded-full bg-faze px-7 py-3.5 font-bold text-white hover:bg-faze-hot">
            Start judging →
          </Link>
          <Link href="/call" className="rounded-full border border-line px-7 py-3.5 font-bold hover:border-fg">
            Pitch an idea
          </Link>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bleed border-t border-line py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted">
        <p className="display text-xl text-fg">
          <span className="text-faze">FAZE</span> NOW
        </p>
        <p>A HackUTA 2026 prototype for the FaZe Clan challenge.</p>
      </div>
    </footer>
  );
}
