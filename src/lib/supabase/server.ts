import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import WebSocket from "ws";
import type { Database } from "@/lib/database.types";

/** Supabase client bound to the request's cookies. Use in Route Handlers and Server Actions. */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Node 20 has no built-in WebSocket; supabase-js constructs a realtime client eagerly
      realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
