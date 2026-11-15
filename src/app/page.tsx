import { Hero } from "@/components/home/hero";
import { Ticker } from "@/components/home/ticker";
import { Bands, Benefits, ClosingCta, SiteFooter } from "@/components/home/sections";
import { ViewGuess } from "@/components/games/view-guess";
import { MemberGuess } from "@/components/games/member-guess";

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />

      <section id="play" className="scroll-mt-20 py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Play daily</p>
            <h2 className="display mt-2 text-6xl md:text-8xl">Play</h2>
          </div>
          <p className="max-w-sm text-muted">
            Two games, real points. Call the views on the next FaZe drop, and solve the daily member
            puzzle.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ViewGuess />
          <MemberGuess />
        </div>
      </section>

      <Benefits />
      <Bands />
      <ClosingCta />
      <SiteFooter />
    </>
  );
}
