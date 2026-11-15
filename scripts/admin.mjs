#!/usr/bin/env node
/**
 *   node --env-file=.env.local scripts/admin.mjs grant  <username>   # make a user an admin
 *   node --env-file=.env.local scripts/admin.mjs revoke <username>
 *   node --env-file=.env.local scripts/admin.mjs list
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws"; // Node 20 has no built-in WebSocket; supabase-js needs one

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});
const [, , cmd, username] = process.argv;

if (cmd === "list") {
  const { data } = await db.from("profiles").select("username, points, is_admin").eq("is_admin", true);
  console.log(data?.length ? data : "No admins yet.");
} else if (cmd === "grant" || cmd === "revoke") {
  if (!username) throw new Error("Give a username (see it on the /me page).");
  const { data, error } = await db
    .from("profiles")
    .update({ is_admin: cmd === "grant" })
    .eq("username", username)
    .select("username, is_admin");
  if (error) throw error;
  console.log(data.length ? data[0] : `No profile with username "${username}".`);
} else {
  console.log("Usage: admin.mjs grant|revoke <username> | list");
}
