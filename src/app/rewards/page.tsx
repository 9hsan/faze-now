import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { RewardsStore } from "./rewards-store";

export const metadata: Metadata = { title: "Rewards · Faze Now" };

export default function RewardsPage() {
  return (
    <>
      <PageHeader eyebrow="Rewards" title="Spend what you earned.">
        Points come from judging clips, backing ideas and playing the daily games. Spend them on
        merch, early drops and moments inside FaZe content.
      </PageHeader>
      <RewardsStore />
    </>
  );
}
