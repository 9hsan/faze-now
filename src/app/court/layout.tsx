import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { CourtTabs } from "./court-tabs";

export default function CourtLayout({ children }: LayoutProps<"/court">) {
  return (
    <>
      <PageHeader eyebrow="Clip Court" title="Every clip gets seen." />
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <CourtTabs />
      </Suspense>
      {children}
    </>
  );
}
