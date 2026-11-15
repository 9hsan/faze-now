#!/usr/bin/env node
/**
 * Demo content for The Call. Marked source='seed' (fictional fan handles), idempotent via source_ref.
 *
 *   npm run seed:call            # insert or refresh
 *   npm run seed:call -- remove  # delete all seed posts
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

if (process.argv[2] === "remove") {
  const { count, error } = await db.from("posts").delete({ count: "exact" }).eq("source", "seed");
  if (error) throw error;
  console.log(`✔ Removed ${count} seed posts`);
  process.exit(0);
}

// [creator, type, body, author, upvotes, hoursAgo, extra]
const POSTS = [
  ["swagg", "request", "Swagg, drop a nuke in every COD ever made. Start at COD 4 and end on the newest one.", "nukeszn", 412, 30, { featured: true }],
  ["rug", "request", "Rug, rewatch your very first FaZe video with the whole crew and react to it", "og_since2011", 288, 52, { status: "seen" }],
  ["faze", "request", "Bring back the 1M subscriber montage format: 60 seconds, best trickshots of the year, one song", "montage_mike", 356, 70, { status: "considering" }],
  ["banks", "request", "Banks, do a tour of every old FaZe house and tell one story from each", "dayonefazefan", 174, 26],
  ["swagg", "request", "Nuke Squad reunion stream with the exact 2020 loadouts", "lobbyleader", 231, 44],
  ["adapt", "request", "Adapt, tell the craziest FaZe house story you've never told on camera", "trickshot_tina", 96, 20],
  ["jarvis", "request", "Jarvis should 1v1 the fans who win Clip Court", "clipcourtjudge", 61, 9],
  ["kay", "request", "Kay, rank every FaZe intro song from worst to best", "kaybeliever", 38, 15],
  ["apex", "request", "Apex, teach a total beginner to hit a trickshot in one day", "apexstudent", 47, 33],
  ["temperrr", "request", "Temperrr, recreate the 2013 FaZe intro shot for shot", "retro_reese", 22, 12],
  ["faze", "request", "Documentary: how FaZe went from trickshot clips to the cover of Sports Illustrated", "faze_freshie", 198, 60, { status: "seen" }],
  ["rug", "request", "Rug x Swagg collab: trickshots only, loser eats the hottest wing", "rugrat_22", 143, 18],
  ["faze", "request", "Rewatch a Halo world championship with the players who won it", "halo_heads", 54, 40],
  ["jarvis", "request", "Jarvis, play every Fortnite season's meta loadout in one video", "noscope_nate", 33, 7],
  ["faze", "poll", "Should FaZe remake the 2012 1M subscriber montage with today's creators?", "montage_mike", 301, 28, { yes: 1840, no: 212, featured: true }],
  ["faze", "poll", "Should FaZe bring back a public recruitment challenge like FaZe5?", "quickscopequeen", 264, 36, { yes: 1311, no: 402, featured: true }],
  ["swagg", "poll", "Should Swagg do a 24-hour Warzone stream with fans in every lobby?", "lilwarzone", 118, 22, { yes: 690, no: 154 }],
  ["faze", "poll", "Should Snoop Dogg star in a FaZe trickshot video?", "snoopfan_99", 177, 48, { yes: 980, no: 133 }],
  ["rug", "poll", "Should Rug reboot his old daily vlog series for one month?", "vlogvault", 66, 14, { yes: 340, no: 290 }],
  ["faze", "poll", "Should FaZe drop a retro 2010-logo merch line?", "dripdrop", 140, 56, { yes: 1120, no: 88 }],
];

function mondayUTC(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const week = mondayUTC();
const rows = POSTS.map(([creator, type, body, author, upvotes, hoursAgo, extra = {}], i) => ({
  source: "seed",
  source_ref: `seed:${i + 1}`,
  source_author: author,
  author_id: null,
  creator_id: creator,
  type,
  body,
  status: extra.status ?? "open",
  upvote_count: upvotes,
  yes_count: extra.yes ?? 0,
  no_count: extra.no ?? 0,
  featured_week: extra.featured ? week : null,
  created_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
}));

const { error } = await db.from("posts").upsert(rows, { onConflict: "source_ref" });
if (error) throw error;
console.log(`✔ Seeded ${rows.length} posts (${rows.filter((r) => r.featured_week).length} featured for week of ${week})`);
