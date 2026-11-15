import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Profile · Faze Now" };

export default function MePage() {
  return (
    <>
      <PageHeader eyebrow="Profile" title="Your record" />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface" />}>
        <ProfileView />
      </Suspense>
    </>
  );
}
