import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach INKFREEDOMPUBLISHING for orders, publishing, rights and press.",
};

const routes = [
  {
    title: "Orders, downloads and payments",
    body: "Open a support ticket from your dashboard so we can see the order and the payment reference. Include the order number if you have it.",
    href: "/dashboard/support",
    cta: "Open a ticket",
  },
  {
    title: "Publishing and submissions",
    body: "Authors with an approved profile should use the author dashboard. New authors apply from the publishing page — applications are reviewed, not instantly granted.",
    href: "/publish",
    cta: "How publishing works",
  },
  {
    title: "Copyright and takedown",
    body: "Rights notices must use the dedicated form so the claim, the claimant and the resolution are recorded properly.",
    href: "/copyright",
    cta: "File a notice",
  },
  {
    title: "Everything else",
    body: "For partnerships, press or anything not covered above, email the team. We aim to reply within five working days.",
    href: "/about",
    cta: "About the press",
  },
];

export default function ContactPage() {
  const email = "hello@inkfreedompublishing.com";
  return (
    <section className="container-editorial py-12 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
        <Link href="/" className="transition-colors hover:text-navy">Home</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span className="text-navy">Contact</span>
      </nav>

      <div className="mt-10 max-w-3xl">
        <p className="eyebrow text-gold-deep">Contact</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.06] text-navy sm:text-5xl">
          Talk to the press
        </h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-charcoal-soft">
          INKFREEDOMPUBLISHING is operated by PEACE-TECH MULTIBIZ
          COMMUNICATIONS, a Nigerian Business Name. Choose the route below so your
          message reaches the right place and is recorded.
        </p>
      </div>

      <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
        {routes.map((route) => (
          <div key={route.title} className="bg-white p-6 sm:p-7">
            <h2 className="font-display text-lg text-navy">{route.title}</h2>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-charcoal-soft">{route.body}</p>
            <Link
              href={route.href}
              className="mt-4 inline-block text-[0.68rem] font-semibold tracking-[0.16em] text-navy uppercase hover:text-gold-deep"
            >
              {route.cta} →
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 border border-line bg-ivory p-6 sm:p-8">
        <p className="eyebrow text-charcoal-soft">Direct email</p>
        <p className="mt-2 text-[1.05rem] text-navy">{email}</p>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-charcoal-soft">
          Email is monitored during Nigerian business hours. A message sent here
          is not a support ticket; for an order problem, open a ticket so the
          order record is attached.
        </p>
      </div>

      <p className="mt-8 text-[0.78rem] text-charcoal-soft">
        Registered name and address are recorded in the platform settings and
        shown in the footer once the registration number is supplied. Nothing is
        invented here: where a legal detail is missing, it is shown as missing.
      </p>
    </section>
  );
}
