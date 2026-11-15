import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false during server render and hydration, true afterwards. Use it to keep client-only values
 * (session, points, unread counts) out of the first render so it matches the server HTML, even in
 * Suspense boundaries that hydrate after that state has already changed.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
