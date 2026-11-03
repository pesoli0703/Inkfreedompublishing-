import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import {
  PORTALS,
  portalForHost,
  portalForPath,
  portalRewritePath,
  portalHosts,
  hostRoutingEnabled,
  shouldPassthrough,
} from "@/lib/portals";

/** Routes that need a session. */
const PROTECTED_PREFIXES = ["/dashboard", "/author", "/admin"];

/** Portal screens that must stay reachable while signed out. */
const PUBLIC_PATHS = new Set([
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/author/signin",
  "/author/register",
  "/admin/signin",
  "/admin/no-access",
]);

const isProtected = (path: string) =>
  PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  ) && !PUBLIC_PATHS.has(path);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hosts = portalHosts();

  /* ---------------------------------------------------------------- Routing */
  // When a portal has its own host, rewrite that host's paths onto the portal's
  // prefix. With no host variables set this block does nothing at all, so the
  // current path-based URLs behave exactly as before.
  let rewrite: URL | null = null;
  if (hostRoutingEnabled(hosts) && !shouldPassthrough(path)) {
    const host = request.headers.get("host");
    const portal = portalForHost(host, hosts);
    const target = portalRewritePath(portal, path, hosts);
    if (target) {
      rewrite = request.nextUrl.clone();
      rewrite.pathname = target;
    }
  }

  if (!isSupabaseConfigured) {
    return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next();
  }

  /* -------------------------------------------------------------- Session */
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The route being rendered: the rewrite target when host routing is on.
  const effectivePath = rewrite ? rewrite.pathname : path;

  if (isProtected(effectivePath) && !user) {
    return redirectTo(request, signInFor(effectivePath), effectivePath);
  }

  /* ----------------------------------------------- Admin gate (defence in depth) */
  // Every /admin page also calls requireAdmin() on the server. This early check
  // stops a signed-in non-admin from even reaching the render, and keeps the
  // rule in one place if a page is ever added without its own guard.
  if (
    user &&
    (effectivePath === "/admin" || effectivePath.startsWith("/admin/")) &&
    effectivePath !== "/admin/signin" &&
    effectivePath !== "/admin/no-access"
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      // Say why, rather than silently landing on the reader dashboard: a
      // redirect with no explanation is indistinguishable from a dead link.
      const denied = request.nextUrl.clone();
      denied.pathname = "/admin/no-access";
      denied.search = "";
      denied.searchParams.set("from", effectivePath);
      return NextResponse.redirect(denied);
    }
  }

  if (rewrite) {
    return NextResponse.rewrite(rewrite, {
      headers: response.headers,
    });
  }

  return response;
}

/** The sign-in screen that belongs to the portal the visitor was reaching for. */
function signInFor(path: string): string {
  if (portalForPath(path) === "admin") return PORTALS.admin.signInPath;
  if (portalForPath(path) === "author") return PORTALS.author.signInPath;
  return PORTALS.reader.signInPath;
}

function redirectTo(request: NextRequest, signIn: string, next: string) {
  const url = request.nextUrl.clone();
  url.pathname = signIn;
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
