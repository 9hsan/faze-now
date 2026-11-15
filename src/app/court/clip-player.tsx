"use client";

import { useEffect, useRef } from "react";
import { clipThumbUrl, clipVideoUrl, type Clip } from "@/lib/clips";

type Props = {
  clip: Clip;
  side: "A" | "B";
  active: boolean;
  muted: boolean;
  watched: number;
  required: number;
  highlight?: "win" | "lose" | null;
  /** Called with additional seconds genuinely watched (seeking doesn't count). */
  onWatch: (seconds: number) => void;
  onActivate: () => void;
  author: string;
};

export function ClipPlayer({
  clip,
  side,
  active,
  muted,
  watched,
  required,
  highlight,
  onWatch,
  onActivate,
  author,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const last = useRef(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {
        /* autoplay can be blocked until the first tap; the tap overlay handles it */
      });
    } else {
      v.pause();
    }
  }, [active, clip.id]);

  useEffect(() => {
    last.current = 0;
  }, [clip.id]);

  const done = watched >= required;
  const pct = required > 0 ? Math.min(100, (watched / required) * 100) : 100;
  const vertical = clip.orientation === "vertical";

  return (
    <figure
      className={`relative overflow-hidden rounded-xl border-2 bg-black transition-colors ${
        highlight === "win"
          ? "border-gold"
          : highlight === "lose"
            ? "border-line opacity-50"
            : active
              ? "border-faze"
              : "border-line"
      }`}
    >
      <div className={`relative mx-auto ${vertical ? "aspect-[9/16] max-h-[68vh]" : "aspect-video"}`}>
        <video
          ref={ref}
          key={clip.id}
          src={clipVideoUrl(clip)}
          poster={clipThumbUrl(clip)}
          className="h-full w-full object-contain"
          playsInline
          loop
          muted={muted}
          preload="auto"
          onClick={onActivate}
          onSeeking={(e) => {
            last.current = e.currentTarget.currentTime;
          }}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            const delta = t - last.current;
            last.current = t;
            // Count only normal playback (looping resets t; seeking jumps are ignored)
            if (delta > 0 && delta < 1.5) onWatch(delta);
          }}
        />

        {!active && (
          <button
            type="button"
            onClick={onActivate}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
            aria-label={`Play clip ${side}`}
          >
            <span className="display flex h-16 w-16 items-center justify-center rounded-full bg-faze text-3xl text-white">
              ▶
            </span>
          </button>
        )}

        <span className="display absolute left-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-2xl">
          {side}
        </span>
        {highlight === "win" && (
          <span className="display absolute right-3 top-3 rounded-md bg-gold px-2.5 py-1 text-xl text-black">
            Winner
          </span>
        )}
      </div>

      <figcaption className="border-t border-line bg-surface px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-bold">{clip.title}</p>
          <p className="shrink-0 text-xs text-muted">{author}</p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] ${done ? "bg-gold" : "bg-faze"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-16 text-right text-xs tabular-nums text-muted">
            {done ? "watched ✓" : `${Math.floor(watched)}/${Math.ceil(required)}s`}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
