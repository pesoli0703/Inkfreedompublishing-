import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PORTALS,
  hostRoutingEnabled,
  portalForHost,
  portalForPath,
  portalHosts,
  portalLinks,
  portalRewritePath,
  portalUrl,
  resolvePortal,
  shouldPassthrough,
} from "@/lib/portals";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const PATH_MODE = portalHosts({});
const HOST_MODE = portalHosts({
  NEXT_PUBLIC_READER_HOST: "inkfreedompublishing.com",
  NEXT_PUBLIC_AUTHOR_HOST: "authors.inkfreedompublishing.com",
  NEXT_PUBLIC_ADMIN_HOST: "admin.inkfreedompublishing.com",
});

describe("path-based routing (today's deployment)", () => {
  it("is the mode in force when no hosts are configured", () => {
    expect(hostRoutingEnabled(PATH_MODE)).toBe(false);
  });

  it("sends each path to the right portal", () => {
    expect(portalForPath("/")).toBe("reader");
    expect(portalForPath("/books/the-weight-of-water")).toBe("reader");
    expect(portalForPath("/dashboard/library")).toBe("reader");
    expect(portalForPath("/author")).toBe("author");
    expect(portalForPath("/author/books/new")).toBe("author");
    expect(portalForPath("/admin")).toBe("admin");
    expect(portalForPath("/admin/withdrawals")).toBe("admin");
  });

  it("resolves by path and never rewrites anything", () => {
    expect(resolvePortal({ host: "inkfreedompublishing.vercel.app", pathname: "/author" }, PATH_MODE)).toBe(
      "author",
    );
    expect(portalRewritePath("author", "/books", PATH_MODE)).toBeNull();
    expect(portalRewritePath("admin", "/orders", PATH_MODE)).toBeNull();
  });

  it("keeps portal links as paths", () => {
    expect(portalUrl("author", "", PATH_MODE)).toBe("/author");
    expect(portalUrl("admin", "", PATH_MODE)).toBe("/admin");
    expect(portalUrl("reader", "", PATH_MODE)).toBe("/");
  });
});

describe("host-based routing (once custom domains are attached)", () => {
  it("turns on as soon as one host is configured", () => {
    expect(hostRoutingEnabled(HOST_MODE)).toBe(true);
  });

  it("maps hosts, including ports and full URLs, to portals", () => {
    expect(portalForHost("inkfreedompublishing.com", HOST_MODE)).toBe("reader");
    expect(portalForHost("www.authors.inkfreedompublishing.com", HOST_MODE)).toBe("reader");
    expect(portalForHost("authors.inkfreedompublishing.com", HOST_MODE)).toBe("author");
    expect(portalForHost("authors.inkfreedompublishing.com:443", HOST_MODE)).toBe("author");
    expect(portalForHost("admin.inkfreedompublishing.com", HOST_MODE)).toBe("admin");
    expect(portalForHost("preview-abc.vercel.app", HOST_MODE)).toBe("reader");
    expect(portalForHost(null, HOST_MODE)).toBe("reader");
  });

  it("rewrites an author-host request onto the author routes", () => {
    expect(portalRewritePath("author", "/", HOST_MODE)).toBe("/author");
    expect(portalRewritePath("author", "/books", HOST_MODE)).toBe("/author/books");
    expect(portalRewritePath("author", "/books/new", HOST_MODE)).toBe("/author/books/new");
    // Already on the portal prefix: leave it alone, or it would loop.
    expect(portalRewritePath("author", "/author/books", HOST_MODE)).toBeNull();
  });

  it("rewrites an admin-host request onto the admin routes", () => {
    expect(portalRewritePath("admin", "/", HOST_MODE)).toBe("/admin");
    expect(portalRewritePath("admin", "/withdrawals", HOST_MODE)).toBe("/admin/withdrawals");
    expect(portalRewritePath("admin", "/admin/orders", HOST_MODE)).toBeNull();
  });

  it("never rewrites API routes, auth callbacks or static files", () => {
    for (const path of [
      "/api/checkout",
      "/api/webhooks/flutterwave",
      "/auth/callback",
      "/_next/static/chunk.js",
      "/covers/weight-of-water.jpg",
      "/icon.svg",
    ]) {
      expect(shouldPassthrough(path)).toBe(true);
    }
    expect(shouldPassthrough("/books")).toBe(false);
  });

  it("keeps path access working on the storefront host during the transition", () => {
    expect(resolvePortal({ host: "inkfreedompublishing.com", pathname: "/author" }, HOST_MODE)).toBe(
      "author",
    );
    expect(
      resolvePortal({ host: "authors.inkfreedompublishing.com", pathname: "/author/books" }, HOST_MODE),
    ).toBe("author");
    expect(
      resolvePortal({ host: "admin.inkfreedompublishing.com", pathname: "/admin" }, HOST_MODE),
    ).toBe("admin");
  });

  it("builds absolute cross-portal links once hosts exist", () => {
    expect(portalUrl("author", "", HOST_MODE)).toBe("https://authors.inkfreedompublishing.com");
    expect(portalUrl("reader", "books", HOST_MODE)).toBe("https://inkfreedompublishing.com/books");
    const links = portalLinks("author", HOST_MODE);
    expect(links.map((link) => link.key)).toEqual(["reader", "admin"]);
  });
});

/* ------------------------------------------------------------------ guards */

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx" || entry === "actions.ts" || entry === "route.ts") out.push(full);
    }
  };
  walk(join(ROOT, dir));
  return out;
}

describe("portal security", () => {
  it("gates every admin page on the server, not just in the UI", () => {
      // Sign-in and the "no access" explanation are the two screens a
      // non-administrator is allowed to reach.
      const pages = pageFiles("app/admin").filter(
        (path) =>
          path.endsWith("page.tsx") &&
          !path.endsWith("signin/page.tsx") &&
          !path.endsWith("no-access/page.tsx"),
      );
    expect(pages.length).toBeGreaterThan(10);
    for (const page of pages) {
      expect(read(page.replace(`${ROOT}/`, ""))).toMatch(/requireAdmin|requireViewer/);
    }
  });

  it("gates every author workspace page behind the author portal guard", () => {
    const pages = pageFiles("app/author").filter(
      (path) =>
        path.endsWith("page.tsx") &&
        !/author\/(register|signin|apply)\/page\.tsx$/.test(path),
    );
    for (const page of pages) {
      expect(read(page.replace(`${ROOT}/`, ""))).toMatch(/requireAuthorArea|requireAdmin/);
    }
  });

  it("gives signed-out visitors the portal's own sign-in screen", () => {
    expect(read("app/author/signin/page.tsx")).toContain("/author/register");
    expect(read("app/admin/signin/page.tsx")).toContain("allowCreate={false}");
    // Administrator accounts are created in the database, never from a form.
    expect(read("app/admin/signin/page.tsx")).toContain("granted inside the");
    expect(read("lib/auth.ts")).toContain("/admin/signin?next=");
  });

  it("redirects unauthorised admins away instead of rendering", () => {
    const auth = read("lib/auth.ts");
    // The redirect has to explain itself: a silent hop to /dashboard is
    // indistinguishable from a dead link.
    expect(auth).toContain('if (viewer.role !== "admin") redirect(`/admin/no-access');
    const middleware = read("middleware.ts");
    expect(middleware).toContain('profile?.role !== "admin"');
    expect(middleware).toContain('denied.pathname = "/admin/no-access"');
  });

  it("explains a missing admin role instead of bouncing silently", () => {
    const page = read("app/admin/no-access/page.tsx");
    expect(page).toContain("getViewer");
    expect(page).toContain("redirect(\"/admin\")");
    expect(page).toContain("/auth/signout");
    // It must never grant anything.
    expect(page).not.toContain("service_role");
    expect(page).not.toContain("update({ role");
  });

  it("never lets a failed admin query look like an empty list", () => {
    const page = read("app/admin/books/page.tsx");
    // An embedded select fails as a whole when PostgREST cannot resolve the
    // relationship, which rendered "Nothing awaiting review" while a book was
    // waiting. Flat selects plus visible errors are the rule now.
    expect(page).not.toMatch(/\.select\(\s*"[^"]*\w\([^"]*\)/);
    expect(page).toContain("error?.message");
    expect(page).toContain("could not be loaded");
    expect(page).toContain("pending.length");
  });

  it("has a real sign-out that only POST can trigger", () => {
    const route = read("app/auth/signout/route.ts");
    expect(route).toContain("export async function POST");
    expect(route).toContain("signOut()");
    expect(read("components/portal-header.tsx")).toContain('action="/auth/signout"');
    // GET must not end a session.
    const getBlock = route.slice(route.indexOf("export async function GET"));
    expect(getBlock).not.toContain("signOut()");
  });

  it("keeps each portal on its own chrome", () => {
    const store = read("app/(store)/layout.tsx");
    expect(store).toContain("SiteHeader");
    for (const portal of ["author", "admin"]) {
      const layout = read(`app/${portal}/layout.tsx`);
      expect(layout).toContain("PortalHeader");
      expect(layout).not.toContain("SiteHeader");
    }
  });

  it("registers an author in one step and lands them in the dashboard", () => {
    const action = read("app/author/register/actions.ts");
    expect(action).toContain("signUp");
    expect(action).toContain('rpc("start_self_publishing"');
    expect(action).toContain('redirect("/author")');
    // No application, no review of the person.
    expect(action).not.toMatch(/author_applications|status\s*=\s*"pending"/);
  });

  it("names the portals the same way the routing layer does", () => {
    expect(PORTALS.author.basePath).toBe("/author");
    expect(PORTALS.admin.basePath).toBe("/admin");
    expect(PORTALS.reader.basePath).toBe("");
  });
});
