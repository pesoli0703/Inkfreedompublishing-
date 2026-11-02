import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Draft privacy, terms and returns policies for INKFREEDOMPUBLISHING.",
};

const sections = [
  {
    id: "privacy",
    title: "Privacy",
    body: [
      "This preview build does not collect personal data. There is no analytics script, no account system, no mailing list and no payment processor connected, so nothing you type into the forms on this site is transmitted or stored.",
      "When accounts, newsletter delivery and payments are connected, this policy will be replaced with a full statement covering what is collected, why, how long it is retained, and how to request deletion — including the processors involved (Supabase for accounts and catalogue data, Flutterwave for payments).",
    ],
  },
  {
    id: "terms",
    title: "Terms of Use",
    body: [
      "The catalogue shown on this site is sample content created for design and development purposes. Titles, author profiles, prices and preview passages are placeholders and do not represent real books, people or offers.",
      "Nothing on this site constitutes a contract of sale. No orders can be placed and no payments can be taken until checkout and fulfilment go live. Author agreements will be published separately before submissions open.",
    ],
  },
  {
    id: "refunds",
    title: "Refunds & Returns",
    body: [
      "Returns and refunds are not yet applicable because no transactions can be completed on this site.",
      "A refund and returns policy covering physical orders, digital editions and damaged deliveries will be published here before sales open. It will be written to sit alongside the payment terms provided by Flutterwave.",
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

          <p className="eyebrow mt-6 text-gold-deep">Draft</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            Site policies
          </h1>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-charcoal-soft">
            The policies below are drafts for a site that is not yet selling
            anything. They will be replaced with final versions — reviewed
            against the payment and data processors actually in use — before the
            marketplace opens.
          </p>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <nav aria-label="On this page" className="lg:col-span-3">
            <p className="eyebrow text-charcoal-soft">On this page</p>
            <ul className="mt-4 space-y-3 border-l border-line pl-4">
              {sections.map((section) => (
                <li key={section.id}>
                  <Link
                    href={`#${section.id}`}
                    className="text-sm text-charcoal-soft transition-colors hover:text-navy"
                  >
                    {section.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-14 lg:col-span-9">
            {sections.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-3xl text-navy">{section.title}</h2>
                <div className="mt-4 space-y-4 text-[0.94rem] leading-relaxed text-charcoal-soft">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
