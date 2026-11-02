"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/library", label: "Library", note: "Books you own" },
  { href: "/wishlist", label: "Wishlist", note: "Saved for later" },
  { href: "/orders", label: "Orders", note: "Purchase history" },
  { href: "/account", label: "Account", note: "Name and password" },
];

export function AccountShell({
  title,
  eyebrow,
  description,
  children,
  aside,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="shell py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        <aside>
          <nav aria-label="Account" className="lg:sticky lg:top-28">
            <p className="label mb-4 text-ink-muted">Your account</p>
            <ul className="space-y-0.5">
              {LINKS.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`group flex items-baseline justify-between gap-2 border-l-2 py-2.5 pl-3 transition-colors ${
                        active
                          ? "border-ember text-ink"
                          : "border-transparent text-ink-muted hover:border-line hover:text-ink"
                      }`}
                    >
                      <span className="text-[0.9rem] font-medium">{link.label}</span>
                      <span className="text-[0.65rem] opacity-0 transition-opacity group-hover:opacity-100">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <form action={signOutAction} className="mt-6 border-t border-line pt-4">
              <button
                type="submit"
                className="pl-3 text-[0.8rem] text-ink-muted transition-colors hover:text-ember"
              >
                Sign out
              </button>
            </form>
          </nav>
        </aside>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
            <div>
              <p className="label text-ink-muted">{eyebrow}</p>
              <h1 className="display-md mt-3 text-ink">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-lg text-[0.9rem] leading-relaxed text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {aside}
          </div>
          <div className="pt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
