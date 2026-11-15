import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CreatorsOverview } from "./creators-overview";

export const metadata: Metadata = { title: "Creator Insights · Faze Now" };

export default function CreatorsPage() {
  return (
    <>
      <PageHeader eyebrow="Creator Insights" title="What fans actually want.">
        Every request from The Call, grouped by creator and theme. Small creators get their own
        board, so their superfans aren&apos;t buried under the biggest channels.
      </PageHeader>
      <CreatorsOverview />
    </>
  );
}
