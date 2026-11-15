export type NavItem = { href: string; label: string; short: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/call", label: "The Call", short: "Call" },
  { href: "/court", label: "Clip Court", short: "Court" },
  { href: "/creators", label: "Creators", short: "Creators" },
  { href: "/me", label: "Profile", short: "Me" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
