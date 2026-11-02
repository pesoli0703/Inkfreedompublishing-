"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./brand";
import { signOutAction } from "@/lib/actions/auth";

export type PortalNavItem = { href: string; label: string; note?: string };

export function PortalShell({
  variant,
  nav,
  user,
  children,
  action,
}: {
  variant: "studio" | "admin";
  nav: PortalNavItem[];
  user: { name: string; email: string; initials: string };
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dark = variant === "admin";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-8">
        <Wordmark tone={dark ? "paper" : "ink"} />
        <p
          className={`label mt-3 ${dark ? "text-paper/40" : "text-ink-muted"}`}
        >
          {variant === "admin" ? "Editorial console" : "Author studio"}
        </p>
      </div>

      <nav aria-label={variant === "admin" ? "Admin" : "Studio"} className="flex-1 space-y-0.5 px-2">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/studio" && item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-[0.85rem] transition-colors ${
                active
                  ? dark
                    ? "bg-paper/10 text-paper"
                    : "bg-paper-deep text-ink"
                  : dark
                    ? "text-paper/55 hover:bg-paper/5 hover:text-paper"
                    : "text-ink-muted hover:bg-paper-deep/60 hover:text-ink"
              }`}
            >
              <span className="font-medium">{item.label}</span>
              {active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t px-5 py-5 ${dark ? "border-paper/10" : "border-line"}`}>
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-8 w-8 place-items-center rounded-full text-[0.65rem] font-medium ${
              dark ? "bg-paper text-ink" : "bg-ink text-paper"
            }`}
          >
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className={`truncate text-[0.78rem] font-medium ${dark ? "text-paper" : "text-ink"}`}>
              {user.name}
            </p>
            <p className={`truncate text-[0.66rem] ${dark ? "text-paper/40" : "text-ink-muted"}`}>
              {user.email}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/"
            className={`text-[0.72rem] ${dark ? "text-paper/50 hover:text-paper" : "text-ink-muted hover:text-ink"}`}
          >
            Storefront
          </Link>
          <span className={dark ? "text-paper/20" : "text-line"}>·</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className={`text-[0.72rem] ${dark ? "text-paper/50 hover:text-paper" : "text-ink-muted hover:text-ink"}`}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${dark ? "bg-paper" : "bg-paper"}`}>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-[16rem] border-r lg:block ${
          dark ? "border-ink bg-ink" : "border-line bg-paper"
        }`}
      >
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div
        className={`sticky top-0 z-50 flex items-center justify-between gap-3 border-b px-4 py-3 lg:hidden ${
          dark ? "border-ink bg-ink" : "border-line bg-paper/95 backdrop-blur"
        }`}
      >
        <Wordmark tone={dark ? "paper" : "ink"} size="sm" />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={`grid h-9 w-9 place-items-center rounded-full border ${
            dark ? "border-paper/20 text-paper" : "border-line text-ink"
          }`}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open ? (
        <div
          className={`fixed inset-x-0 top-[3.75rem] bottom-0 z-40 overflow-y-auto lg:hidden ${
            dark ? "bg-ink" : "bg-paper"
          }`}
        >
          {sidebar}
        </div>
      ) : null}

      <div className="lg:pl-[16rem]">
        <div className="mx-auto max-w-[88rem] px-4 py-8 md:px-8 md:py-10">
          {action ? <div className="mb-6 flex flex-wrap items-center justify-end gap-3">{action}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
