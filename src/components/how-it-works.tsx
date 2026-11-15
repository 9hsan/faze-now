import type { ReactNode } from "react";

export type Step = { title: string; body: ReactNode; tag?: string };

/** Numbered explainer for first-time fans. Swipeable strip on phones, a row on desktop. */
export function HowItWorks({ steps, label = "How it works" }: { steps: Step[]; label?: string }) {
  return (
    <section aria-label={label} className="mb-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="w-[78%] shrink-0 snap-start rounded-xl border border-line bg-surface p-4 sm:w-[46%] md:w-auto"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="display text-3xl text-faze">{i + 1}</span>
              {s.tag && <span className="text-xs font-bold text-gold">{s.tag}</span>}
            </div>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
