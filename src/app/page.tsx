import Link from "next/link";

const PILLARS = [
  {
    href: "/call",
    eyebrow: "The Call",
    title: "You pitch it. FaZe hears it.",
    body: "Post a request or a yes/no poll and back the ideas you want made. Top picks get answered in FaZe uploads. If your idea gets made, you get credited.",
    cta: "Make the call",
  },
  {
    href: "/court",
    eyebrow: "Clip Court",
    title: "Every clip gets seen.",
    body: "Judge two clips at a time. New clips go to the front of the line, so no one gets buried. The best ones make the bracket, and the champion plays with a FaZe creator.",
    cta: "Start judging",
  },
  {
    href: "/creators",
    eyebrow: "Creator Insights",
    title: "Creators see what fans want.",
    body: "Each creator gets a live view of what their fans are asking for, grouped into themes so smaller voices still count.",
    cta: "See the insights",
  },
];

const EARN = [
  { pts: "+2", what: "Judge a matchup in Clip Court" },
  { pts: "+5", what: "Post a request or poll" },
  { pts: "+1", what: "Each upvote your post gets" },
  { pts: "+50", what: "A request you backed gets made" },
  { pts: "+100", what: "Scout: back the champion in round 1" },
  { pts: "+500", what: "Your own idea gets made" },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-14">
      <section className="pt-4 md:pt-10">
        <p className="eyebrow">Kingmakers since 2010</p>
        <h1 className="display mt-3 text-6xl md:text-8xl">
          FaZe picked the kings.
          <br />
          <span className="text-faze">Now the fans do.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Faze Now is where fans shape what FaZe makes next. Pitch ideas, judge creator clips, and
          earn points for it. No sign-up needed to start.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/court"
            className="rounded-md bg-faze px-5 py-3 font-bold text-white transition-colors hover:bg-faze-hot"
          >
            Judge clips now
          </Link>
          <Link
            href="/call"
            className="rounded-md border border-line px-5 py-3 font-bold transition-colors hover:border-fg"
          >
            See what fans are asking for
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col rounded-xl border border-line bg-surface p-6 transition-colors hover:border-faze"
          >
            <p className="eyebrow">{p.eyebrow}</p>
            <h2 className="display mt-3 text-3xl">{p.title}</h2>
            <p className="mt-3 flex-1 text-muted">{p.body}</p>
            <span className="mt-5 text-sm font-bold text-faze group-hover:text-faze-hot">
              {p.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section>
        <p className="eyebrow">How you earn</p>
        <h2 className="display mt-2 text-4xl">Points for showing up</h2>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EARN.map((e) => (
            <li
              key={e.what}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <span className="display w-14 shrink-0 text-2xl text-gold">{e.pts}</span>
              <span className="text-sm">{e.what}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
