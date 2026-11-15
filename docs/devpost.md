# Faze Now

**FaZe picked the kings. Now the fans do.**

## Inspiration

FaZe Clan has more than 31 million followers, and they aren't quiet. Every upload fills with fans asking for videos, reunions, collabs and throwbacks. That's the most valuable signal a creator company can have, and right now it's scattered across comment sections on five platforms, where the loudest request in one video gets buried by the next. Creators end up guessing. A superfan of one of FaZe's smaller creators may never be heard at all.

We saw a disconnect: fans who care deeply about FaZe's direction have no real way to shape it, and a creator team that wants to know what its audience wants has no reliable way to find out. FaZe's own story points to the answer. It was built by turning gamers into household names, from trickshot montages to Swagg getting his offer live on stream. **FaZe has always been made with its audience. We wanted to make that official.**

Faze Now gives fans' voices an integral, structured part in where FaZe goes next. Fans pitch and back ideas, FaZe sees exactly what its audience wants, and the top requests get answered inside FaZe's own videos. That closes the loop between the people watching and the people making.

## What it does

Faze Now has two sides: a fan hub, and a creator dashboard for FaZe.

**For fans:**
- **The Call:** fans post requests ("Swagg, drop a nuke in every COD ever made") or yes/no polls, tag the creator they're for, and upvote the ideas they'd actually watch. Every week the top picks are answered in a short segment inside a FaZe upload. When a request gets made, the fan who pitched it gets 500 points and credit, and everyone who backed it is notified instantly and earns 50.
- **Clip Court:** an open, fan-judged tournament for gaming clips. Fans watch two clips and pick the better one. New clips are shown first, so every submission gets seen, and ratings work like chess rankings. The top 8 enter a bracket that fans vote on round by round; the champion plays with a FaZe creator in a video.
- **Play:** two games on the home page. *Guess the Views* (call the 7-day views on FaZe's next upload; the 10 closest win points) and a daily *Guess the Member* puzzle that teaches new fans FaZe's history.
- **Rewards:** points from judging, pitching and playing are spent on merch discounts, early access to drops, and moments inside FaZe videos.
- **No sign-up to start:** every visitor gets a guest account instantly, so a fan scanning a QR code can vote in seconds.

**For FaZe:**
- **Creator Insights:** every creator gets a dashboard of what their fans want: top and rising requests, each request's share of that creator's support, the most-requested collabs, and how returning fans differ from new ones.
- **AI weekly brief:** Gemini reads every request for a creator, groups them into themes and writes a short brief for the creator's team. Admins regenerate it live in about 4 seconds.
- **Admin tools:** mark requests seen or under consideration (the fan is notified), fulfill them with the YouTube link, feature picks for the weekly segment, seed and run brackets, and resolve Guess the Views.

**The loop:** fans pitch, back and judge, which gives FaZe proof of demand, which shapes what FaZe makes, which is answered in uploads, which sends more fans to the platform.

## How we built it

- **App:** Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS 4, designed mobile-first for QR-code traffic.
- **Backend:** Supabase. Postgres with row-level security on every table, anonymous guest sessions, Realtime for live vote counts and notifications, and Storage for clips.
- **Trust by design:** fans can only write through narrow column permissions or validating database functions. Points move only through a server-side ledger, so nobody can award themselves points, vote twice, vote on their own clip, or vote without watching. Clip Court's matchmaking (least-seen clip first, closest-rated opponent, never a repeat pair), the ratings, bracket seeding and payouts all run in SQL.
- **AI:** Google Gemini (`gemini-3.5-flash`) through the official GenAI SDK, with a JSON schema for structured output and Zod validation. The key stays on the server, and results are written through an admin-only database function, so the web server never holds a database admin key.
- **Content pipeline:** an FFmpeg script uses scene-change detection to split long videos into individual clips, encodes them for phones, and generates thumbnails.
- **Brand:** built to FaZe's official brand guidelines: Red Alert #E4002B, the F mark at the sizes the logo rules require, and the tiger camo as texture.

Sample fan posts and some votes are seeded demo data, marked as such in the database.

## Challenges we ran into

- **Next.js 16's new rendering model:** with Cache Components, anything reading the session has to sit behind a Suspense boundary, and our header kept tripping hydration errors because the guest session loaded before the boundary hydrated. We solved it by rendering exactly the server's output until hydration finishes.
- **A Windows path bug:** opening the project folder with different capitalization made the bundler load React twice, and the build failed with a misleading `useContext` error.
- **Making points impossible to cheat:** every reward path (votes, upvotes, bracket picks, fulfills, redemptions) had to be enforced in the database rather than the browser.
- **AI speed:** the first Gemini brief took 24 seconds, too slow to press live. Tuning the thinking level brought it to about 4 seconds with the same quality.
- **Choosing what not to build:** buying points looked like easy revenue, but points pay out prizes, so that edges toward gambling with a young audience. Paid boosts would have corrupted the demand data that makes the creator dashboards valuable. We kept every vote equal.

## Accomplishments that we're proud of

- A working product, not a mockup, built solo in under 24 hours: live votes, live notifications, real clips, and AI briefs.
- **The live fulfill:** when an admin marks a request made, every backer's phone shows the notification and points update in about a second.
- **AI insights FaZe could use on Monday morning,** including surfacing smaller creators' audiences instead of drowning them out.
- 52 automated server-side checks covering voting, anti-cheat, brackets, payouts, The Call, the games and the rewards store, run against the live database.
- A design that follows FaZe's brand guidelines down to logo sizing.

## What we learned

- The most valuable thing a fan platform produces isn't engagement. It's **data a creator can act on**. Designing around that changed every feature decision.
- Trust is a feature. Keeping every vote equal, with no paid boosts and no buying points, is what makes the insights worth anything.
- New fans need a way in. Explaining each feature in plain language (what it is, how it works, what you get) mattered as much as building it.

## What's next for Faze Now

- **Pilot:** one creator, one season. Put the weekly Call segment into their uploads and measure sign-ups per upload and how fulfilled videos perform against the channel's average.
- **Sponsored seasons:** "Clip Court Season 2, presented by…" with brand partners funding the prizes, building on FaZe's existing partnerships.
- **FaZe Now+ membership:** early merch drops, bonus cuts, members-only watch parties and cosmetics. Perks, never influence: a member's vote counts exactly the same as everyone's.
- **Discord sign-in and roles,** plus a bot that announces fulfilled requests in FaZe's servers.
- **YouTube integration:** pull performance data for fulfilled videos into the dashboard, so creators see the return on listening to their fans.
- Real submissions with moderation, and push notifications.

## Built With

next.js · react · typescript · tailwindcss · supabase · postgresql · google-gemini · zod · ffmpeg · node.js · vercel
