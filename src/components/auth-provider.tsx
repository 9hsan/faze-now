"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;

type AuthState = {
  /** True once a session exists (guest or Discord) and the profile has loaded. */
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  isGuest: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  /** Keep a guest's points by attaching Discord; falls back to plain sign-in if that Discord account already exists. */
  connectDiscord: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      // The profile row is created by a database trigger on sign-up; retry briefly in case it lags.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (data) {
          setProfile(data);
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setError("Couldn't load your profile.");
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      let sessionUser = data.session?.user ?? null;

      if (!sessionUser) {
        // Silent guest account: QR visitors can vote with zero friction.
        const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          if (!cancelled) {
            setError(anonError.message);
            setReady(true);
          }
          return;
        }
        sessionUser = anon.user;
      }

      if (cancelled || !sessionUser) return;
      setUser(sessionUser);
      await loadProfile(sessionUser.id);
      if (!cancelled) setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        return;
      }
      if (session?.user && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const connectDiscord = useCallback(
    async (next = "/me") => {
      setError(null);
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const isAnon = user?.is_anonymous ?? true;

      if (isAnon && user) {
        const { error: linkError } = await supabase.auth.linkIdentity({
          provider: "discord",
          options: { redirectTo },
        });
        if (!linkError) return; // browser is redirecting to Discord
        if (!/already|exists/i.test(linkError.message)) {
          setError(linkError.message);
          return;
        }
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo },
      });
      if (signInError) setError(signInError.message);
    },
    [supabase, user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Drop straight back into a fresh guest session
    setReady(false);
    const { data } = await supabase.auth.signInAnonymously();
    if (data.user) {
      setUser(data.user);
      await loadProfile(data.user.id);
    }
    setReady(true);
  }, [supabase, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      profile,
      isGuest: user?.is_anonymous ?? true,
      error,
      refreshProfile,
      connectDiscord,
      signOut,
    }),
    [ready, user, profile, error, refreshProfile, connectDiscord, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
