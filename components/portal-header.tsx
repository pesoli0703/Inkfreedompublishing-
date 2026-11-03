"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./brand";
import type { PortalKey } from "@/lib/portals";

export type PortalNavItem = { href: string; label: string };

/**
 * Chrome for the author and admin portals.
 *
 * The bookstore header is deliberately not reused: those portals are tools, not
 * the shop, and their navigation should not invite a signed-in author back into
 * the catalogue mid-task. A single link back to the storefront is offered
 * instead, plus a portal switcher and a real sign-out form.
 */
export function PortalHeader({
  portal,
  items,
  viewer,
  links,
}: {
  portal: Exclude<PortalKey, "reader">;
  items: PortalNavItem[];
  viewer: { name: string; email: string } | null;
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const admin = portal === "admin";
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        admin ? "border-white/10 bg-navy text-ivory" : "border-line bg-ivory/95 backdrop-blur"
      }`}
    >
      <div className="container-editorial flex h-16 items-center justify-between gap-4 sm:h-18">
        <div className="flex items-center gap-3 sm:gap-5">
          <Wordmark tone={admin ? "ivory" : "navy"} showTagline={false} />
          <Link
            href={admin ? "/admin" : "/author"}
            className={`hidden border px-2.5 py-1 text-[0.6rem] font-semibold tracking-[0.16em] uppercase sm:inline-block ${
              admin ? "border-gold/40 text-gold-soft" : "border-gold/50 text-gold-deep"
            }`}
          >
            {admin ? "Admin" : "Authors"}
          </Link>
        </div>

        <nav aria-label={`${admin ? "Admin" : "Author"} portal`} className="hidden items-center gap-6 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`text-[0.72rem] font-medium tracking-[0.12em] uppercase transition-colors ${
                isActive(item.href)
                  ? admin
                    ? "text-gold-soft"
                    : "text-navy"
                  : admin
                    ? "text-ivory/65 hover:text-ivory"
                    : "text-charcoal-soft hover:text-navy"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {viewer ? (
            <>
              <span
                className={`hidden max-w-[12rem] truncate text-[0.72rem] sm:inline ${
                  admin ? "text-ivory/70" : "text-charcoal-soft"
                }`}
                title={viewer.email}
              >
                {viewer.name || viewer.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className={`border px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase transition-colors ${
                    admin
                      ? "border-white/25 text-ivory hover:border-gold hover:text-gold-soft"
                      : "border-line text-navy hover:border-navy"
                  }`}
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href={admin ? "/admin/signin" : "/author/signin"}
              className={`border px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] uppercase transition-colors ${
                admin
                  ? "border-white/25 text-ivory hover:border-gold hover:text-gold-soft"
                  : "border-navy text-navy hover:bg-navy hover:text-ivory"
              }`}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="portal-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`inline-flex h-10 w-10 items-center justify-center border lg:hidden ${
              admin ? "border-white/25 text-ivory" : "border-line text-navy"
            }`}
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 h-px w-full bg-current transition-all duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute top-1.5 left-0 h-px w-full bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-full bg-current transition-all duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <nav
        aria-label={`${admin ? "Admin" : "Author"} portal, compact`}
        className={`container-editorial flex gap-5 overflow-x-auto border-t py-2.5 lg:hidden ${
          admin ? "border-white/10" : "border-line"
        }`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`shrink-0 text-[0.7rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase ${
              isActive(item.href)
                ? admin
                  ? "text-gold-soft"
                  : "text-navy"
                : admin
                  ? "text-ivory/60"
                  : "text-charcoal-soft"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        id="portal-mobile-nav"
        className={`overflow-hidden border-t transition-[max-height] duration-300 lg:hidden ${
          admin ? "border-white/10 bg-navy" : "border-line bg-ivory"
        } ${open ? "max-h-[26rem]" : "max-h-0"}`}
      >
        <nav aria-label="Mobile portal" className="container-editorial flex flex-col py-3">
          {[...items, ...links].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 text-[0.8rem] tracking-[0.08em] uppercase ${
                admin ? "text-ivory/80" : "text-charcoal-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function PortalFooter({
  portal,
  links,
}: {
  portal: Exclude<PortalKey, "reader">;
  links: { label: string; href: string }[];
}) {
  const admin = portal === "admin";
  return (
    <footer
      className={`border-t ${
        admin ? "border-white/10 bg-navy text-ivory/60" : "border-line bg-ivory-deep text-charcoal-soft"
      }`}
    >
      <div className="container-editorial flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.72rem]">
          {admin
            ? "Private administration console. Access is logged."
            : "INKFREEDOMPUBLISHING author portal — 90% royalties, no publishing contract."}
        </p>
        <div className="flex flex-wrap gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[0.72rem] transition-colors ${
                admin ? "hover:text-gold-soft" : "hover:text-navy"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
