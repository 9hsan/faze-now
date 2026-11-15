"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import { clipThumbUrl, clipVideoUrl, type Clip } from "@/lib/clips";

const SLIDE_MS = 7000;

const SLIDES = [
  {
    eyebrow: "Kingmakers since 2010",
    title: (
      <>
        FaZe picked the kings.
        <br />
        <span className="text-faze">Now the fans do.</span>
      </>
    ),
    body: "Pitch what FaZe makes next, judge the next generation of clips, and earn real rewards for it.",
    cta: { href: "/court", label: "Start judging" },
  },
  {
    eyebrow: "The Call",
    title: (
      <>
        Pitch the next
        <br />
        <span className="text-faze">FaZe video.</span>
      </>
    ),
    body: "The most-backed ideas get answered inside FaZe uploads. If yours gets made, you get credited.",
    cta: { href: "/call", label: "Make the call" },
  },
  {
    eyebrow: "Play daily",
    title: (
      <>
        Guess. Judge.
        <br />
        <span className="text-faze">Get paid in points.</span>
      </>
    ),
    body: "Guess the views on the next drop, solve the daily member puzzle, and spend points on merch and moments.",
    cta: { href: "/#play", label: "Play now" },
  },
];

export function Hero() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Background: the top-rated fan clips from Clip Court
  useEffect(() => {
    getSupabase()
      .from("clips")
      .select("*")
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(SLIDES.length)
      .then(({ data }) => setClips(data ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {
      /* autoplay can be blocked; the poster still shows */
    });
  }, [index, clips]);

  const slide = SLIDES[index];
  const clip = clips.length ? clips[index % clips.length] : null;

  return (
    <section className="bleed relative -mt-6 h-[86svh] min-h-[560px] overflow-hidden bg-black">
      {clip ? (
        <video
          ref={videoRef}
          key={`${clip.id}-${index}`}
          src={clipVideoUrl(clip)}
          poster={clipThumbUrl(clip)}
          className="kenburns absolute inset-0 h-full w-full object-cover opacity-70"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(228,0,43,0.35),transparent_60%)]" />
      )}

      {/* Giant outlined wordmark + legibility gradients */}
      <p className="display outline-text pointer-events-none absolute -right-6 top-6 select-none text-[28vw] leading-none md:text-[22vw]" aria-hidden>
        FAZE
      </p>
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-14">
        <div key={index} className="max-w-3xl animate-[fadeUp_600ms_ease-out]">
          <p className="eyebrow">{slide.eyebrow}</p>
          {/* Capped by height too, so short laptop/projector screens don't push it under the header */}
          <h1 className="display mt-3 text-[min(13vw,9svh)] leading-[0.9] md:text-[min(6rem,10svh)]">{slide.title}</h1>
          <p className="mt-4 max-w-xl text-base text-fg/80 md:text-lg">{slide.body}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={slide.cta.href}
              className="rounded-full bg-faze px-6 py-3 font-bold text-white transition-colors hover:bg-faze-hot"
            >
              {slide.cta.label} →
            </Link>
            <span className="text-sm text-fg/60">Free · no sign-up needed</span>
          </div>
        </div>

        {/* Slide progress */}
        <div className="mt-[min(2.5rem,4svh)] grid grid-cols-3 gap-3" role="tablist" aria-label="Featured">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
              onClick={() => setIndex(i)}
              className="group py-2"
            >
              <span className="block h-[3px] overflow-hidden rounded-full bg-white/20">
                {i === index ? (
                  <span key={`fill-${index}`} className="progress-fill block h-full rounded-full bg-white" style={{ ["--slide-ms" as string]: `${SLIDE_MS}ms` }} />
                ) : i < index ? (
                  <span className="block h-full bg-white/60" />
                ) : null}
              </span>
              <span className="mt-2 hidden text-left text-xs font-semibold uppercase tracking-wider text-fg/50 group-hover:text-fg md:block">
                {s.eyebrow}
              </span>
            </button>
          ))}
        </div>
        {clip && (
          <p className="absolute right-4 top-6 hidden rounded-full bg-black/50 px-3 py-1 text-xs text-fg/70 backdrop-blur md:block">
            On screen: #{(index % clips.length) + 1} in Clip Court · {clip.title}
          </p>
        )}
      </div>
    </section>
  );
}
