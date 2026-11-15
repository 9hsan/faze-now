import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { HowItWorks } from "@/components/how-it-works";
import { CallFeed } from "./call-feed";

export const metadata: Metadata = { title: "The Call · Faze Now" };

const STEPS = [
  {
    title: "Pitch an idea",
    tag: "+5 pts",
    body: "Post a request (\"Swagg, nuke every COD\") or a yes/no poll, and tag the creator it's for.",
  },
  {
    title: "Back what you want made",
    tag: "+1 per upvote",
    body: "Upvote ideas you'd watch. Ideas with the most backing rise to the top, and their authors earn a point per upvote.",
  },
  {
    title: "FaZe answers the top picks",
    body: "Every week, the top polls and requests get a response inside a FaZe upload: made, planned, or an honest no.",
  },
  {
    title: "If it gets made, you get paid",
    tag: "+500 / +50",
    body: "The fan who pitched it gets 500 points and credit in the video. Everyone who backed it gets 50 and a notification.",
  },
];

export default function CallPage() {
  return (
    <>
      <PageHeader eyebrow="The Call" title="You pitch it. FaZe hears it.">
        The Call is where fans tell FaZe what to make next. Creators see every request on their own
        dashboard, so even small ideas with loyal backers get noticed.
      </PageHeader>
      <HowItWorks steps={STEPS} />
      <CallFeed />
    </>
  );
}
