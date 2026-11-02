"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./brand";

type ViewerSummary = {
  name: string;
  role: "reader" | "author" | "admin";
  initials: string;
} | null;

const NAV = [
  { href: "/books", label: "The shelf" },
  { href: "/authors", label: "Authors" },
  { href: "/publish", label: "Publish" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ viewer }: { viewer: ViewerSummary }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const home = viewer
    ? viewer.role === "admin"
      ? "/admin"
      : viewer.role === "author"
        ? "/studio"
        : "/library"
    : "/signin";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || pathname !== "/"
          ? "border-line bg-paper/90 backdrop-blur-md"
          : "border-transparent bg-paper/60 backdrop-blur-sm"
      }`}
    >
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-[0.8125rem] font-medium tracking-[-0.005em] transition-colors ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute -bottom-1.5 left-0 h-[1.5px] w-full bg-ember" />
                  ) : null}
                </Link>
              );
            })}
            {viewer?.role === "author" ? (
              <Link
                href="/studio"
                className="text-[0.8125rem] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Studio
              </Link>
            ) : null}
            {viewer?.role === "admin" ? (
              <Link
                href="/admin"
                className="text-[0.8125rem] font-medium text-ember transition-opacity hover:opacity-70"
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/books"
            aria-label="Search the catalogue"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink sm:flex"
          >
            <SearchIcon />
          </Link>

          {viewer ? (
            <Link
              href={home}
              className="hidden items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-3.5 transition-colors hover:border-ink sm:flex"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[0.65rem] font-medium text-paper">
                {viewer.initials}
              </span>
              <span className="max-w-[7rem] truncate text-[0.8rem] font-medium text-ink">
                {viewer.name}
              </span>
            </Link>
          ) : (
            <Link href="/signin" className="hidden text-[0.82rem] font-medium text-ink sm:block">
              Sign in
            </Link>
          )}

          <Link href="/publish" className="btn btn-primary hidden h-10 px-5 text-[0.8rem] md:inline-flex">
            Sell your ebook
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-paper-deep lg:hidden"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[4.5rem] bottom-0 z-40 overflow-y-auto border-t border-line bg-paper lg:hidden"
        >
          <nav aria-label="Mobile" className="shell flex flex-col py-6">
            {NAV.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-baseline justify-between border-b border-line-soft py-4"
              >
                <span className="font-display text-[1.75rem] text-ink">{item.label}</span>
                <span className="label text-ink-muted">0{index + 1}</span>
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-3">
              {viewer ? (
                <>
                  <Link href={home} className="btn btn-primary w-full">
                    {viewer.role === "admin" ? "Admin console" : viewer.role === "author" ? "Author studio" : "My library"}
                  </Link>
                  <Link href="/account" className="btn btn-quiet w-full">
                    Account settings
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signin" className="btn btn-primary w-full">
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn btn-quiet w-full">
                    Create a reader account
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14M3 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
