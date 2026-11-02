import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
  showReviewNote = true,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
  showReviewNote?: boolean;
}) {
  return (
    <section className="container-editorial py-12 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
        <Link href="/" className="transition-colors hover:text-navy">
          Home
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-navy">{title}</span>
      </nav>

      <div className="mt-9 grid gap-12 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <p className="eyebrow text-gold-deep">{eyebrow}</p>
          <p className="mt-3 text-[0.72rem] text-charcoal-soft">Last updated {updated}</p>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal-soft uppercase">
              Related
            </p>
            <ul className="mt-3 space-y-2 text-[0.8rem]">
              {[
                ["/terms", "Terms of Use"],
                ["/privacy", "Privacy Policy"],
                ["/refunds", "Refund Policy"],
                ["/withdrawal-policy", "Withdrawal Policy"],
                ["/author-agreement", "Author Agreement"],
                ["/copyright", "Copyright & Takedown"],
                ["/faq", "FAQ"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-charcoal-soft hover:text-navy">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="lg:col-span-9">
          <h1 className="font-display text-4xl leading-[1.08] text-navy sm:text-5xl">{title}</h1>
          {intro && (
            <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-charcoal-soft">{intro}</p>
          )}

          <div className="legal-prose mt-9 space-y-6 text-[0.92rem] leading-relaxed text-charcoal">
            {children}
          </div>

          {showReviewNote && (
            <div className="mt-12 border border-gold/50 bg-ivory p-5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-charcoal-soft">
                Nigerian legal review required
              </p>
              <p className="mt-2 text-[0.82rem] leading-relaxed text-charcoal-soft">
                This document describes how the platform actually operates, but it
                has not been reviewed by Nigerian counsel and is not a legal
                certification. It should be reviewed against the Nigeria Data
                Protection Act 2023, the Federal Competition and Consumer
                Protection Act 2018 and applicable copyright law before launch.
              </p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-navy sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
