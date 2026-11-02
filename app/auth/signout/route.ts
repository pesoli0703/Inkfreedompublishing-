import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Sign out.
 *
 * POST only, from a form in each portal header — a GET request must never end a
 * session, or any image tag could log a reader out. The Supabase client clears
 * the auth cookies; we then send the visitor back to the public storefront so a
 * shared device does not stay on someone's dashboard.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase?.auth.signOut();

  return NextResponse.redirect(storefrontUrl(request), { status: 303 });
}

/**
 * Build the redirect from the request's own host.
 *
 * `request.url` can carry the server's bind address (0.0.0.0 on a self-hosted
 * node), so the public host headers are used instead.
 */
function storefrontUrl(request: Request): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      return new URL("/", site);
    } catch {
      // fall through to the request host
    }
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return new URL("/", `${proto}://${host}`);
  return new URL("/", request.url);
}

export async function GET(request: Request) {
  // Browsing to this URL does nothing; it exists so a stale link cannot log
  // anyone out by accident.
  return NextResponse.redirect(storefrontUrl(request), { status: 303 });
}
