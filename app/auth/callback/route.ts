import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles the link from the magic-link email. Supports both the PKCE `?code=`
// flow and the `?token_hash=&type=` flow, then redirects into the app.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/";

  const supabase = createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, url.origin));
  }
  // Link invalid or expired — send back to login.
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
