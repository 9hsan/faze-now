import type { ReactNode } from "react";
import { pct, splitShare, type Split } from "@/lib/insights";

/** Single-series magnitude bars (neutral ink, so red/blue stay reserved for fan segments). */
export function BarList({
  rows,
  valueLabel,
  empty = "No data yet.",
}: {
  rows: { key: string; label: ReactNode; sub?: ReactNode; value: number; display?: string; title?: string }[];
  valueLabel: string;
  empty?: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="grid gap-3" aria-label={valueLabel}>
      {rows.map((r) => (
        <li
          key={r.key}
          tabIndex={0}
          title={r.title}
          className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-faze"
        >
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted group-hover:text-fg">{r.display ?? r.value}</span>
          </div>
          {r.sub && <div className="text-xs text-muted">{r.sub}</div>}
          <div className="mt-1.5 h-2 rounded bg-surface-2">
            <div
              className="h-2 rounded bg-fg/70 transition-colors group-hover:bg-fg group-focus-visible:bg-fg"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SplitLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-returning" /> Returning fans
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-new" /> New fans
      </span>
    </div>
  );
}

/** 100% split of support between returning and new fans. Percentages are always printed as text. */
export function SplitBar({ split, height = "h-3", showLabels = true }: { split: Split; height?: string; showLabels?: boolean }) {
  const s = splitShare(split);
  const known = split.returning + split.new;
  const label = known
    ? `Returning fans ${pct(s.returning)}, new fans ${pct(s.new)}`
    : "No fan-type data yet";
  return (
    <div title={label} aria-label={label} role="img">
      <div className={`flex gap-[2px] ${height}`}>
        {known === 0 ? (
          <div className="h-full flex-1 rounded bg-surface-2" />
        ) : (
          <>
            {s.returning > 0 && (
              <div className="h-full rounded bg-returning" style={{ flexGrow: s.returning, flexBasis: 0 }} />
            )}
            {s.new > 0 && <div className="h-full rounded bg-new" style={{ flexGrow: s.new, flexBasis: 0 }} />}
          </>
        )}
      </div>
      {showLabels && known > 0 && (
        <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
          <span>{pct(s.returning)} returning</span>
          <span>{pct(s.new)} new</span>
        </div>
      )}
    </div>
  );
}

export function StatTile({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="display mt-1 text-4xl tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
