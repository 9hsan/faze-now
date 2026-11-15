import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** OAuth return point (Discord sign-in or linking a guest account to Discord). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/me";
  // Only allow same-site relative redirects
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/me";

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    return NextResponse.redirect(
      new URL(`/me?auth_error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  const providerError = searchParams.get("error_description") ?? "Sign-in was cancelled";
  return NextResponse.redirect(
    new URL(`/me?auth_error=${encodeURIComponent(providerError)}`, origin),
  );
}
