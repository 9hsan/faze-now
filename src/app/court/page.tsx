import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Clip Court · Faze Now" };

export default function CourtPage() {
  return (
    <PageHeader eyebrow="Clip Court" title="Every clip gets seen.">
      Two clips. You pick the better one. New clips go to the front of the line.
    </PageHeader>
  );
}
