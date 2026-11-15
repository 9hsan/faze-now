export type NavItem = { href: string; label: string; short: string; mobile?: boolean };

export const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home", mobile: true },
  { href: "/call", label: "The Call", short: "Call", mobile: true },
  { href: "/court", label: "Clip Court", short: "Court", mobile: true },
  { href: "/creators", label: "Creators", short: "Creators" },
  { href: "/rewards", label: "Rewards", short: "Rewards", mobile: true },
  { href: "/me", label: "Profile", short: "Me", mobile: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
