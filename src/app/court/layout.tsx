import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { HowItWorks } from "@/components/how-it-works";
import { CourtTabs } from "./court-tabs";

const STEPS = [
  {
    title: "Watch two clips",
    body: "Each matchup puts two clips from the same category side by side. Watch about 10 seconds of each to unlock your vote.",
  },
  {
    title: "Pick the better one",
    tag: "+2 pts",
    body: "Your vote moves both clips' ratings. Beating a higher-rated clip counts for more, like chess rankings.",
  },
  {
    title: "Clips climb the leaderboard",
    body: "Every clip starts at 1000. New clips are shown first, so every submission gets seen, not just popular ones.",
  },
  {
    title: "Bracket crowns a champion",
    tag: "+100 Scout",
    body: "The top 8 in a category enter a bracket and fans vote round by round. Back the champion early to earn Scout points.",
  },
];

export default function CourtLayout({ children }: LayoutProps<"/court">) {
  return (
    <>
      <PageHeader eyebrow="Clip Court" title="Every clip gets seen.">
        Clip Court is an open, fan-judged tournament for gaming clips. Anyone can submit a clip, and
        the community decides which ones are best, two at a time. It&apos;s how FaZe has always found
        new talent, except now fans pick.
      </PageHeader>

      <section className="mb-6 overflow-hidden rounded-2xl border border-faze/40 bg-[url('/brand/camo-red.webp')] bg-[length:420px_auto]">
        <div className="bg-gradient-to-r from-black via-black/85 to-black/40 p-5 md:p-6">
          <p className="eyebrow">Season 1 challenge</p>
          <h2 className="display mt-1 text-3xl md:text-4xl">Show us your best moment</h2>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-[1.2fr_1fr] md:gap-6">
            <p className="text-fg/80">
              Four categories: <span className="font-semibold text-fg">Trickshots</span>,{" "}
              <span className="font-semibold text-fg">Montages</span>, <span className="font-semibold text-fg">Funny</span>{" "}
              and <span className="font-semibold text-fg">FaZe Tribute</span>. Clips up to 90 seconds. Skill counts, but so
              does making something people want to watch.
            </p>
            <ul className="grid gap-1.5 text-fg/80">
              <li>
                <span className="font-bold text-gold">Champion:</span> plays with a FaZe creator in a video
              </li>
              <li>
                <span className="font-bold text-gold">Top 16:</span> featured in an official FaZe compilation
              </li>
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/court#judge" className="rounded-full bg-faze px-4 py-2 text-sm font-bold text-white hover:bg-faze-hot">
              Start judging
            </Link>
            <Link href="/court/submit" className="rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:border-white">
              Submit a clip
            </Link>
          </div>
        </div>
      </section>

      <HowItWorks steps={STEPS} />

      <div id="judge" className="scroll-mt-20" />
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <CourtTabs />
      </Suspense>
      {children}
    </>
  );
}
