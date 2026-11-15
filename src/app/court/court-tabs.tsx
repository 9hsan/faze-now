"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/court", label: "Judge" },
  { href: "/court/bracket", label: "Bracket" },
  { href: "/court/leaderboard", label: "Leaderboard" },
  { href: "/court/submit", label: "Submit a clip" },
];

export function CourtTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto px-4" aria-label="Clip Court">
      <ul className="flex min-w-max gap-2">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`block rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-faze bg-faze text-white"
                    : "border-line text-muted hover:border-fg hover:text-fg"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
