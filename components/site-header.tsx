"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./brand";

const navItems = [
  { href: "/books", label: "Discover Books" },
  { href: "/categories", label: "Categories" },
  { href: "/authors", label: "Authors" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu when the route changes, without an effect that would
  // trigger a cascading render.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-line bg-ivory/92 shadow-[0_1px_20px_-12px_rgba(16,28,50,0.5)] backdrop-blur-md"
          : "border-transparent bg-ivory/80 backdrop-blur-sm"
      }`}
    >
      <div className="container-editorial flex h-16 items-center justify-between gap-4 sm:h-20">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative py-2 text-[0.78rem] font-medium tracking-[0.1em] uppercase transition-colors ${
                isActive(item.href)
                  ? "text-navy"
                  : "text-charcoal-soft hover:text-navy"
              }`}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 left-0 h-px bg-gold transition-all duration-300 ${
                  isActive(item.href)
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/signin"
            className="hidden items-center gap-2 border border-navy px-5 py-2.5 text-[0.7rem] font-semibold tracking-[0.16em] text-navy uppercase transition-colors hover:bg-navy hover:text-ivory sm:inline-flex"
          >
            Sign In
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center border border-line text-navy transition-colors hover:border-navy lg:hidden"
          >
            <span className="relative block h-3.5 w-5">
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

      <div
        id="mobile-nav"
        className={`overflow-hidden border-t border-line bg-ivory transition-[max-height,opacity] duration-300 lg:hidden ${
          open ? "max-h-[26rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="container-editorial flex flex-col py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`border-b border-line/70 py-4 font-display text-lg transition-colors ${
                isActive(item.href) ? "text-gold-deep" : "text-navy"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/signin"
            className="mt-5 mb-4 inline-flex items-center justify-center bg-navy px-5 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
