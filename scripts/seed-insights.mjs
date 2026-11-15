#!/usr/bin/env node
/**
 * Sample data for Creator Insights: extra requests per creator, hand-written themes and weekly
 * summaries. Everything is marked source='seed' with fictional fan handles. Running the AI grouping
 * job (scripts/themes.mjs) later replaces these themes and summaries with generated ones.
 *
 *   npm run seed:insights           # run after npm run seed:call
 *   npm run seed:insights -- remove
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const HANDLES = [
  "og_since2011", "dayonefazefan", "montage_mike", "trickshot_tina", "nukeszn", "lobbyleader",
  "quickscopequeen", "faze_freshie", "clipcourtjudge", "noscope_nate", "rugrat_22", "halo_heads",
  "kaybeliever", "apexstudent", "retro_reese", "lilwarzone", "snoopfan_99", "vlogvault", "dripdrop",
  "sweatyslayer", "zoomer_zach", "boomer_brad", "csgo_carl", "mapmaker_mo", "editwizard", "latejoiner",
];

// Fan type for the 20 posts from seed-call.mjs (seed:1 … seed:20)
const CALL_FAN_TYPES = {
  1: "returning", 2: "returning", 3: "returning", 4: "returning", 5: "returning", 6: "new", 7: "new",
  8: "returning", 9: "new", 10: "returning", 11: "new", 12: "new", 13: "returning", 14: "new",
  15: "returning", 16: "new", 17: "new", 18: "new", 19: "returning", 20: "returning",
};

// creator -> themes -> posts. A post is either a seed-call ref ("seed:N") or
// [body, upvotes, fanType, hoursAgo].
const DATA = {
  swagg: {
    summary:
      "Swagg's fans want big COD challenges first: the nuke-in-every-COD request is the most-backed idea on the whole platform. Returning fans are pushing hard for a Nuke Squad reunion, while newer fans keep asking for the story of his live FaZe offer.",
    themes: [
      ["COD & Warzone challenges", "High-skill, high-stakes Call of Duty challenges, led by nukes across every era.", [
        "seed:1", "seed:17",
        ["Swagg, win a Warzone match using only the starting pistol", 186, "new", 20],
        ["Nuke on every DLC map from the old map packs, no other killstreaks", 94, "returning", 50],
        ["Swagg vs the top 10 Clip Court trickshotters in a private match", 77, "new", 6],
      ]],
      ["Nuke Squad reunion", "Returning fans want the original Nuke Squad back together.", [
        "seed:5",
        ["Nuke Squad reacts to their own 2020 clips", 88, "returning", 28],
        ["Nuke Squad trios tournament where a fan fills the fourth spot", 64, "returning", 11],
      ]],
      ["The FaZe offer story", "New fans want to hear how Swagg got his offer live on stream.", [
        ["Swagg, retell the night you got your FaZe offer live on stream", 132, "new", 34],
        ["Day in the life of Swagg before a big stream", 41, "new", 16],
      ]],
    ],
  },
  rug: {
    summary:
      "Rug's audience splits cleanly. Returning fans want him to revisit his 2013 era, and the 'react to your first FaZe video' request is still climbing. New fans want collabs, with Rug x Swagg the most requested pairing.",
    themes: [
      ["Origin-era nostalgia", "Returning fans want Rug to revisit where he started.", [
        "seed:2", "seed:19",
        ["Rug, remake your 2013 FaZe joining video 13 years later", 121, "returning", 40],
        ["Read the first comment ever left on your channel", 58, "returning", 25],
      ]],
      ["Collabs", "Pairings fans keep asking for, led by Rug x Swagg.", [
        "seed:12",
        ["Rug x Banks: the ultimate FaZe house tour", 77, "new", 19],
        ["Rug and Jarvis: 24 hours of trickshots", 49, "new", 8],
      ]],
      ["Fan-planned videos", "Fans want a direct hand in what Rug films.", [
        ["Rug, let fans plan an entire video through The Call", 98, "new", 5],
        ["Overnight challenge in the original FaZe house", 66, "new", 30],
      ]],
    ],
  },
  faze: {
    summary:
      "On the main channel, the 1M subscriber montage revival is the biggest theme, backed by both new and returning fans. New fans are asking for FaZe history explained, and they keep asking for a say in who FaZe signs next.",
    themes: [
      ["Montage revival", "Bring back the 1M subscriber montage format, with today's creators and fan clips.", [
        "seed:3", "seed:15",
        ["Yearly fan-made montage where every clip comes from Clip Court winners", 154, "new", 13],
        ["Remaster the 2012 montage in 4K with the original song", 112, "returning", 46],
      ]],
      ["FaZe history, explained", "New fans want the backstory: how FaZe became FaZe.", [
        "seed:11",
        ["Series: one video per FaZe era, 2010 to now", 140, "new", 22],
        ["Explain the Sports Illustrated cover for people who just found the channel", 97, "new", 17],
      ]],
      ["Recruitment & community", "Fans want to help pick the next FaZe member.", [
        "seed:16",
        ["Let fans vote on the next FaZe signing", 188, "new", 9],
        ["Open tryouts at a live event", 71, "returning", 38],
      ]],
      ["Esports throwbacks", "Rewatches of championship moments with the players who won them.", [
        "seed:13",
        ["Rewatch a Counter-Strike major win with that roster", 63, "returning", 44],
      ]],
      ["Merch & brand collabs", "Retro merch and fan-designed collabs.", [
        "seed:18", "seed:20",
        ["Bring back the Nike collab with a fan-designed colorway", 109, "new", 27],
      ]],
    ],
  },
  banks: {
    summary:
      "Banks' fans want two things: the untold FaZe house stories, which returning fans are driving, and an inside look at how FaZe became a company, which new fans are driving.",
    themes: [
      ["FaZe house stories", "The stories behind the houses FaZe grew up in.", [
        "seed:4",
        ["Banks, rank the five wildest nights in FaZe house history", 82, "returning", 31],
        ["What really happened at the first FaZe house", 57, "returning", 50],
      ]],
      ["How the business works", "How FaZe went from a YouTube channel to a company.", [
        ["Banks, explain how FaZe went from YouTube channel to company", 69, "new", 21],
        ["How do brand deals like McDonald's actually work?", 44, "new", 14],
      ]],
    ],
  },
  adapt: {
    summary: "Adapt's fans mostly want storytimes about classic FaZe moments, plus a few cross-creator challenges.",
    themes: [
      ["Storytime", "Untold stories from inside FaZe.", [
        "seed:6",
        ["Adapt storytime: worst prank in FaZe history", 52, "returning", 24],
      ]],
      ["Challenges", "Adapt taking on other creators' games.", [
        ["Adapt tries to beat Swagg at Warzone after one week of practice", 39, "new", 10],
      ]],
    ],
  },
  jarvis: {
    summary: "Jarvis' fans want Fortnite content and a chance to play him, especially Clip Court winners.",
    themes: [
      ["Fortnite deep dives", "Fortnite history and skill content.", [
        "seed:14",
        ["Jarvis teaches building to a total beginner", 29, "new", 12],
      ]],
      ["Play with fans", "Matches between Jarvis and the community.", [
        "seed:7",
        ["Jarvis vs the Clip Court champion, winner picks the next video", 44, "new", 4],
      ]],
    ],
  },
  kay: {
    summary:
      "Kay's board is small but focused: most of his fans are asking for FaZe intro music content. On the main feed these requests would be buried; here they're clearly his audience's top ask.",
    themes: [
      ["Intros & music", "Ranking, reacting to and remaking FaZe intro music.", [
        "seed:8",
        ["Kay, make a new FaZe intro beat from fan-voted samples", 31, "returning", 9],
        ["React to every FaZe intro since 2010", 24, "returning", 21],
      ]],
      ["Kay x creators", "Collabs with the rest of FaZe.", [
        ["Kay and Rug cook-off", 12, "new", 18],
      ]],
    ],
  },
  apex: {
    summary: "Apex's fans want coaching content, plus throwbacks to the original trickshot maps.",
    themes: [
      ["Coaching", "Apex teaching fans to get better.", [
        "seed:9",
        ["Apex coaches a fan from bronze to diamond", 35, "new", 15],
      ]],
      ["Trickshot throwbacks", "Classic maps and classic shots.", [
        ["Apex plays the original FaZe trickshot maps", 28, "returning", 26],
      ]],
    ],
  },
  temperrr: {
    summary: "Temperrr's fans want retro remakes and a look at how he edits.",
    themes: [
      ["Retro remakes", "Rebuilding early FaZe videos with modern editing.", [
        "seed:10",
        ["Temperrr recreates the first FaZe montage with modern editing", 19, "returning", 13],
      ]],
      ["Editing breakdowns", "How the edits get made.", [
        ["Temperrr, show how you'd edit a Clip Court winner", 15, "new", 7],
      ]],
    ],
  },
};

function mondayUTC(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const creators = Object.keys(DATA);

if (process.argv[2] === "remove") {
  await db.from("posts").delete().like("source_ref", "seed:ins:%");
  await db.from("themes").delete().in("creator_id", creators);
  await db.from("creator_summaries").delete().in("creator_id", creators);
  console.log("✔ Removed insight seed posts, themes and summaries");
  process.exit(0);
}

// Fan types for the seed-call posts
for (const [n, t] of Object.entries(CALL_FAN_TYPES)) {
  await db.from("posts").update({ author_fan_type: t }).eq("source_ref", `seed:${n}`);
}

// Fresh themes for these creators
await db.from("posts").update({ theme_id: null }).in("creator_id", creators);
await db.from("themes").delete().in("creator_id", creators);

let added = 0;
let h = 0;
for (const [creator, { summary, themes }] of Object.entries(DATA)) {
  for (const [ti, [label, themeSummary, posts]] of themes.entries()) {
    const { data: theme, error: tErr } = await db
      .from("themes")
      .insert({ creator_id: creator, label, summary: themeSummary })
      .select("id")
      .single();
    if (tErr) throw tErr;

    const refs = [];
    for (const [pi, p] of posts.entries()) {
      if (typeof p === "string") {
        refs.push(p);
        continue;
      }
      const [body, upvotes, fanType, hoursAgo] = p;
      const ref = `seed:ins:${creator}:${ti}:${pi}`;
      const { error } = await db.from("posts").upsert(
        {
          source: "seed",
          source_ref: ref,
          source_author: HANDLES[h++ % HANDLES.length],
          creator_id: creator,
          type: "request",
          body,
          upvote_count: upvotes,
          author_fan_type: fanType,
          created_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
        },
        { onConflict: "source_ref" },
      );
      if (error) throw error;
      refs.push(ref);
      added++;
    }

    await db.from("posts").update({ theme_id: theme.id }).in("source_ref", refs);
    const { data: members } = await db.from("posts").select("upvote_count").eq("theme_id", theme.id);
    await db
      .from("themes")
      .update({
        post_count: members.length,
        total_support: members.reduce((s, m) => s + m.upvote_count, 0),
      })
      .eq("id", theme.id);
  }

  await db
    .from("creator_summaries")
    .upsert({ creator_id: creator, week_of: mondayUTC(), summary }, { onConflict: "creator_id,week_of" });
}

const themeCount = Object.values(DATA).reduce((s, d) => s + d.themes.length, 0);
console.log(`✔ ${added} insight posts, ${themeCount} themes, ${creators.length} weekly summaries`);
