import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Creators · Faze Now" };

export default function CreatorsPage() {
  return (
    <PageHeader eyebrow="Creator Insights" title="What fans actually want.">
      Each creator&apos;s requests, grouped into themes, so the long tail gets heard too.
    </PageHeader>
  );
}
