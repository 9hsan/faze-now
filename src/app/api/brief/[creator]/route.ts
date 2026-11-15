import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_MODEL, generateBrief } from "@/lib/brief-core.mjs";

/**
 * POST /api/brief/:creator — admins regenerate a creator's AI themes and weekly brief.
 * Gemini runs here (the key never reaches the browser); the result is written with the admin's own
 * session through apply_creator_brief, so no service-role key is needed on the server.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/brief/[creator]">) {
  const { creator } = await ctx.params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const [{ data: c }, { data: posts, error: postsErr }] = await Promise.all([
    supabase.from("creators").select("id, name").eq("id", creator).maybeSingle(),
    supabase
      .from("posts")
      .select("id, type, body, upvote_count, author_fan_type")
      .eq("creator_id", creator)
      .neq("status", "removed")
      .order("upvote_count", { ascending: false })
      .limit(400),
  ]);
  if (!c) return NextResponse.json({ error: "Unknown creator." }, { status: 404 });
  if (postsErr) return NextResponse.json({ error: postsErr.message }, { status: 500 });
  if (!posts?.length) return NextResponse.json({ error: "No posts for this creator yet." }, { status: 400 });

  let brief;
  try {
    brief = await generateBrief({
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      creatorName: c.name,
      posts,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  const { data: applied, error: applyErr } = await supabase.rpc("apply_creator_brief", {
    p_creator: creator,
    p_themes: brief.themes,
    p_summary: brief.summary,
    p_model: brief.model,
  });
  if (applyErr) return NextResponse.json({ error: applyErr.message }, { status: 500 });

  return NextResponse.json({ ...(applied as object), summary: brief.summary, model: brief.model, posts: posts.length });
}
