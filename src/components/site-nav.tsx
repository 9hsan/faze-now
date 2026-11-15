"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";
import { useAuth } from "@/components/auth-provider";
import { useHydrated } from "@/lib/use-hydrated";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Faze Now home">
      {/* Brand mark: 1-color version under 60px, never below the 40px minimum */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/faze-mark-1c.png" alt="" width={40} height={26} className="h-[26px] w-10" />
      <span className="display text-2xl leading-none">NOW</span>
    </Link>
  );
}

export function PointsChip() {
  const auth = useAuth();
  const hydrated = useHydrated();
  // Until hydration finishes, render exactly what the server did
  const ready = hydrated && auth.ready;
  const profile = hydrated ? auth.profile : null;
  const isGuest = auth.isGuest;
  const unread = hydrated ? auth.unread : 0;
  return (
    <Link
      href="/me"
      className="relative flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold"
      aria-label={unread ? `${unread} new notifications` : undefined}
    >
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-faze px-1 text-[11px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
      {ready && profile ? (
        <span className="tabular-nums">{profile.points.toLocaleString()} pts</span>
      ) : (
        <span className="text-muted">···</span>
      )}
      {ready && isGuest ? (
        <span className="hidden text-xs text-muted sm:inline">guest</span>
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.filter((n) => n.href !== "/" && n.href !== "/me").map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                isActive(pathname, n.href) ? "text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {n.label}
              {isActive(pathname, n.href) ? (
                <span className="mt-0.5 block h-0.5 rounded bg-faze" aria-hidden />
              ) : null}
            </Link>
          ))}
        </nav>
        <PointsChip />
      </div>
    </header>
  );
}

/** Thumb-reachable tabs on phones (most demo traffic comes from QR scans). */
export function BottomNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const hydrated = useHydrated();
  const unread = hydrated ? auth.unread : 0;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.filter((n) => n.mobile).map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  active ? "text-fg" : "text-muted"
                }`}
              >
                <span
                  className={`h-1 w-6 rounded-full ${active ? "bg-faze" : "bg-transparent"}`}
                  aria-hidden
                />
                <span className="relative">
                  {n.short}
                  {n.href === "/me" && unread > 0 && (
                    <span className="absolute -right-2.5 -top-0.5 h-2 w-2 rounded-full bg-faze" aria-label="new notifications" />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
