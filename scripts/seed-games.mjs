#!/usr/bin/env node
/** Opens a demo Guess the Views round (idempotent by title). npm run seed:games */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const TITLE = "FaZe Clan's next main-channel upload";
const locksAt = new Date(Date.now() + 2 * 24 * 3600e3).toISOString(); // two days out

const { data: existing } = await db.from("view_rounds").select("id").eq("title", TITLE).eq("status", "open").maybeSingle();
const res = existing
  ? await db.from("view_rounds").update({ locks_at: locksAt }).eq("id", existing.id)
  : await db.from("view_rounds").insert({ title: TITLE, creator_id: "faze", locks_at: locksAt });
if (res.error) throw res.error;
console.log(`✔ ${existing ? "Extended" : "Opened"} "${TITLE}", guessing closes ${locksAt}`);
