import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Privacy, terms and refund policies for INKFREEDOMPUBLISHING.",
};

const sections = [
  {
    id: "privacy",
    title: "Privacy",
    body: [
      "Accounts are held in Supabase Authentication. When you register we store your email address and, if you give one, your name. Placing an order stores the order, its line items, the delivery details you supply and any payment reference returned by the payment provider.",
      "Authored work — manuscripts, cover artwork, author biographies — is stored in private storage buckets and is readable only by you and by platform staff who review it. Cover artwork and author photographs are served publicly so that book pages and author pages can display them.",
      "Payments, when they are enabled, are processed by Flutterwave. Card details are entered on Flutterwave's hosted checkout and never reach our servers; we receive a transaction reference and status which we store against the order.",
      "We use no advertising or third-party analytics scripts. Newsletter signup is not currently connected, so no email address entered in that form is transmitted or stored. To request a copy of your data, or its deletion, use the routes on the contact page.",
    ],
  },
  {
    id: "terms",
    title: "Terms of Use",
    body: [
      "Prices are set by authors in Nigerian Naira and converted for other currencies using a published rate table; the rate, its source and the moment it was applied are recorded on each order line. The price shown at checkout is the price charged.",
      "Authors grant INKFREEDOMPUBLISHING a licence to sell the editions listed on this site. Rights remain with the author, and the terms of each title are agreed in writing before publication. Commission is 90% to the author and 10% to the platform, before separately charged payment-gateway fees.",
      "Only administrators can approve a book for publication. Authors cannot approve their own work, and no one can grant themselves author or administrator status from the browser.",
      "Every book carries a platform-assigned Book ID (for example INK-BK-000001). It is permanent, is never chosen by an author, and is not an ISBN.",
    ],
  },
  {
    id: "refunds",
    title: "Refunds & Returns",
    body: [
      "Customer payments are not yet switched on. Until they are, no checkout can complete and no money is taken through this site.",
      "When sales open, a full refund and returns policy covering physical orders, digital editions and damaged deliveries will be published here before the first transaction. It will sit alongside the payment terms provided by Flutterwave, and digital download access will be granted only after the payment has been verified server-side.",
    ],
  },
];

export default function PoliciesPage() {
  return (
    <>
      <section className="border-b border-line bg-white paper-texture">
        <div className="container-editorial py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">Policies</span>
          </nav>

          <p className="eyebrow mt-6 text-gold-deep">The fine print</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            Policies
          </h1>
          <p className="mt-5 max-w-2xl text-[0.97rem] leading-relaxed text-charcoal-soft">
            How we handle your data, how the marketplace is governed, and what
            happens with refunds.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  className="inline-flex border border-line bg-white px-4 py-2 text-[0.68rem] font-medium tracking-[0.1em] text-charcoal-soft uppercase transition-colors hover:border-navy/40 hover:text-navy"
                >
                  {section.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <div className="space-y-12">
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-24 border-t border-line pt-8"
            >
              <h2 className="font-display text-2xl text-navy sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-4 max-w-3xl space-y-4 text-[0.94rem] leading-relaxed text-charcoal-soft">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
