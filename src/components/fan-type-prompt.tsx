"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";

const DISMISS_KEY = "faze-now:fan-type-dismissed";

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** One tap on first visit: returning vs new fan. Powers the split in Creator Insights. */
export function FanTypePrompt() {
  const { ready, profile, refreshProfile } = useAuth();
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && wasDismissed());
  const [saving, setSaving] = useState(false);

  if (!ready || !profile || profile.fan_type || hidden) return null;

  async function choose(fanType: "returning" | "new") {
    if (!profile) return;
    setSaving(true);
    await getSupabase().from("profiles").update({ fan_type: fanType }).eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: just hide for this session */
    }
    setHidden(true);
  }

  return (
    <div
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-xl border border-line bg-surface-2 p-4 shadow-2xl md:bottom-6"
      role="dialog"
      aria-label="How long have you followed FaZe?"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Quick one</p>
          <p className="mt-1 font-bold">How long have you followed FaZe?</p>
        </div>
        <button type="button" onClick={dismiss} className="text-sm text-muted hover:text-fg" aria-label="Dismiss">
          ✕
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => choose("returning")}
          className="rounded-lg border border-returning/60 bg-returning/10 px-3 py-3 text-left disabled:opacity-50"
        >
          <span className="display block text-xl">I was there</span>
          <span className="text-xs text-muted">Trickshot era, OG fan</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => choose("new")}
          className="rounded-lg border border-new/60 bg-new/10 px-3 py-3 text-left disabled:opacity-50"
        >
          <span className="display block text-xl">I&apos;m new here</span>
          <span className="text-xs text-muted">Found FaZe recently</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">This helps creators see what new and longtime fans each want.</p>
    </div>
  );
}
