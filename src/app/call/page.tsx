import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CallFeed } from "./call-feed";

export const metadata: Metadata = { title: "The Call · Faze Now" };

export default function CallPage() {
  return (
    <>
      <PageHeader eyebrow="The Call" title="You pitch it. FaZe hears it.">
        Requests and yes/no polls from the community. Back the ideas you want made. Top picks get
        answered in FaZe uploads.
      </PageHeader>
      <CallFeed />
    </>
  );
}
