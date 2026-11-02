/**
 * Portal resolution.
 *
 * The platform is one Next.js application and one database, with three
 * experiences: the reader bookstore, the author self-publishing dashboard and
 * the admin console.
 *
 * Today they are served from paths on one host (`/`, `/author`, `/admin`).
 * When custom domains exist, set the host environment variables below and the
 * same code serves each portal from its own subdomain — no route moves, no
 * second deployment, no duplicated business logic:
 *
 *   NEXT_PUBLIC_READER_HOST=inkfreedompublishing.com
 *   NEXT_PUBLIC_AUTHOR_HOST=authors.inkfreedompublishing.com
 *   NEXT_PUBLIC_ADMIN_HOST=admin.inkfreedompublishing.com
 *
 * With no host variables set, everything behaves exactly as it does now.
 */

export type PortalKey = "reader" | "author" | "admin";

export type Portal = {
  key: PortalKey;
  name: string;
  /** Path prefix on a shared host. "" for the reader bookstore. */
  basePath: "" | "/author" | "/admin";
  /** Where the portal starts. */
  homePath: string;
  /** Portal-specific sign-in screen. */
  signInPath: string;
  /** Portal-specific account creation screen, when it has one. */
  registerPath?: string;
  /** Environment variable that assigns this portal its own host. */
  hostEnvVar: string;
};

export const PORTALS: Record<PortalKey, Portal> = {
  reader: {
    key: "reader",
    name: "INKFREEDOMPUBLISHING",
    basePath: "",
    homePath: "/",
    signInPath: "/signin",
    registerPath: "/register",
    hostEnvVar: "NEXT_PUBLIC_READER_HOST",
  },
  author: {
    key: "author",
    name: "INKFREEDOMPUBLISHING Authors",
    basePath: "/author",
    homePath: "/author",
    signInPath: "/author/signin",
    registerPath: "/author/register",
    hostEnvVar: "NEXT_PUBLIC_AUTHOR_HOST",
  },
  admin: {
    key: "admin",
    name: "INKFREEDOMPUBLISHING Admin",
    basePath: "/admin",
    homePath: "/admin",
    signInPath: "/admin/signin",
    hostEnvVar: "NEXT_PUBLIC_ADMIN_HOST",
  },
};

export type PortalHosts = Record<PortalKey, string | null>;

const normaliseHost = (value: string | undefined | null) => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;
  return first.replace(/^https?:\/\//, "").replace(/\/+$/, "").replace(/:\d+$/, "");
};

/** Hosts come from the environment; absent means path-based routing. */
export function portalHosts(
  env: Record<string, string | undefined> = process.env,
): PortalHosts {
  return {
    reader: normaliseHost(env[PORTALS.reader.hostEnvVar]),
    author: normaliseHost(env[PORTALS.author.hostEnvVar]),
    admin: normaliseHost(env[PORTALS.admin.hostEnvVar]),
  };
}

/** True once at least one portal has been given its own host. */
export function hostRoutingEnabled(hosts: PortalHosts = portalHosts()): boolean {
  return Boolean(hosts.reader || hosts.author || hosts.admin);
}

/** Which portal a bare host belongs to. Falls back to the reader bookstore. */
export function portalForHost(
  host: string | null | undefined,
  hosts: PortalHosts = portalHosts(),
): PortalKey {
  const clean = normaliseHost(host ?? null);
  if (!clean) return "reader";
  if (hosts.admin && clean === hosts.admin) return "admin";
  if (hosts.author && clean === hosts.author) return "author";
  return "reader";
}

/** Which portal a path belongs to. Used when host routing is off. */
export function portalForPath(pathname: string): PortalKey {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/author" || pathname.startsWith("/author/")) return "author";
  return "reader";
}

/**
 * The portal a request is actually served by: the host decides when host
 * routing is configured, otherwise the path does.
 */
export function resolvePortal(
  {
    host,
    pathname,
  }: {
    host?: string | null;
    pathname: string;
  },
  hosts: PortalHosts = portalHosts(),
): PortalKey {
  if (!hostRoutingEnabled(hosts)) return portalForPath(pathname);
  const byHost = portalForHost(host, hosts);
  const readerHostServesAll = byHost === "reader" && hosts.reader !== null;
  if (readerHostServesAll) return portalForPath(pathname);
  return byHost;
}

/** Paths that must never be rewritten by host routing. */
const PASSTHROUGH = ["/api", "/auth", "/_next", "/_vercel", "/.well-known"];

export function shouldPassthrough(pathname: string): boolean {
  if (PASSTHROUGH.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // Files served from /public.
  return /\.[a-z0-9]{2,6}$/i.test(pathname);
}

/**
 * When a request arrives on a portal's own host, rewrite it onto that portal's
 * path prefix. Returns null when no rewrite is needed.
 */
export function portalRewritePath(
  portal: PortalKey,
  pathname: string,
  hosts: PortalHosts = portalHosts(),
): string | null {
  const target = PORTALS[portal];
  if (target.basePath === "") return null;
  if (pathname === target.basePath || pathname.startsWith(`${target.basePath}/`)) {
    return null;
  }
  // Only rewrite when the portal actually owns a host, or when the caller is
  // already on that portal's host.
  if (!hosts[portal]) return null;
  if (pathname === "/") return target.basePath;
  return `${target.basePath}${pathname}`;
}

/** Absolute or relative URL for a portal entry point. */
export function portalUrl(
  portal: PortalKey,
  path = "",
  hosts: PortalHosts = portalHosts(),
): string {
  const target = PORTALS[portal];
  const clean = path.replace(/^\/+/, "");
  if (hosts[portal]) {
    const suffix = clean ? `/${clean}` : "";
    return `https://${hosts[portal]}${suffix}`;
  }
  if (target.basePath === "") return `/${clean}`.replace(/\/$/, "/");
  return clean && path.startsWith(target.basePath)
    ? `/${clean}`
    : `${target.basePath}${clean ? `/${clean}` : ""}`;
}

/** The cross-portal links shown in the portal switcher. */
export function portalLinks(
  current: PortalKey,
  hosts: PortalHosts = portalHosts(),
): { key: PortalKey; label: string; href: string }[] {
  const links: { key: PortalKey; label: string; href: string }[] = [
    {
      key: "reader",
      label: current === "reader" ? "Bookstore" : "View the bookstore",
      href: portalUrl("reader", "", hosts),
    },
    {
      key: "author",
      label: current === "author" ? "Author dashboard" : "Author portal",
      href: portalUrl("author", "", hosts),
    },
    {
      key: "admin",
      label: current === "admin" ? "Admin dashboard" : "Admin portal",
      href: portalUrl("admin", "", hosts),
    },
  ];
  return links.filter((link) => link.key !== current);
}
