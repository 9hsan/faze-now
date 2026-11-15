import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatorDashboard } from "./creator-dashboard";

export const metadata: Metadata = { title: "Creator dashboard · Faze Now" };

export default function CreatorPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <CreatorDashboard />
    </Suspense>
  );
}
