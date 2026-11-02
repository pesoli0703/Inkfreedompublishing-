import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about buying, downloading, publishing and getting paid.",
};

const groups = [
  {
    title: "Buying and reading",
    items: [
      {
        q: "Do I need an account to buy?",
        a: "Yes. An account holds your library, your order history and your download history. Browsing needs no account.",
      },
      {
        q: "Which currencies can I pay in?",
        a: "Nigerian Naira, US Dollars, Pounds Sterling and Euros. Authors set one NGN base price; the other currencies are derived from it using a stored rate with a source and timestamp, or an administrative override.",
      },
      {
        q: "What happens if no rate is available for my currency?",
        a: "The title is shown as unavailable in that currency instead of being sold at a guessed price. Nothing is converted using a stale rate either — rates older than seven days are ignored.",
      },
      {
        q: "Which formats are sold?",
        a: "Digital editions (EPUB and PDF) today. Print editions are described in the catalogue but are not on sale while fulfilment is being finalised.",
      },
    ],
  },
  {
    title: "Downloads",
    items: [
      {
        q: "How long do I have to download my book?",
        a: "Your access is permanent. Each download link is valid for seven days from the moment you request it, and you can request a new link as often as you like at no cost.",
      },
      {
        q: "Why did my download link stop working?",
        a: "Signed links expire. Request a fresh one from your library. If a link expires within the seven days, contact support — that would be a fault.",
      },
      {
        q: "Can I download on more than one device?",
        a: "Yes, by requesting a link on each device. The licence is personal, so the file should not be shared.",
      },
    ],
  },
  {
    title: "Publishing",
    items: [
      {
        q: "Can I just start uploading books?",
        a: "No. Author access is granted after an application is reviewed. Applicants provide a full name, pen name, biography, country, photograph and areas of interest.",
      },
      {
        q: "Who decides whether my book is published?",
        a: "An administrator reviews each submission and either approves it, returns it for changes with a written note, or rejects it with a reason. Every decision is recorded in an audit trail.",
      },
      {
        q: "Can I set prices in dollars myself?",
        a: "No. You set the NGN base price. Other currencies are converted by the platform so pricing stays consistent; an administrator can override a specific currency with a recorded reason.",
      },
    ],
  },
  {
    title: "Money",
    items: [
      {
        q: "What is the royalty split?",
        a: "90% to the author and 10% to the platform on the listed price. The split is applied per order line and posted to a double-entry ledger.",
      },
      {
        q: "What is the minimum withdrawal?",
        a: "₦5,000. Earnings are held for seven days after each sale so refunds can be reversed without creating a negative balance.",
      },
      {
        q: "How are payouts made?",
        a: "Manually by bank transfer at present. When an administrator pays, the bank reference is recorded against the withdrawal. Status changes are visible in your author dashboard.",
      },
      {
        q: "Are gateway fees taken from my share?",
        a: "No. Gateway fees are recorded against the payment record. They are only reflected in an author balance through an explicit adjustment entry with a reason.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <LegalPage
      eyebrow="Help"
      title="Frequently asked questions"
      updated="2 November 2026"
      intro="Short answers to the questions the platform actually receives. If something here does not match what happens when you use the site, tell us — the answer is wrong and the site is right."
      showReviewNote={false}
    >
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="font-display text-xl text-navy sm:text-2xl">{group.title}</h2>
          <dl className="mt-4 divide-y divide-line">
            {group.items.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="text-[0.92rem] font-medium text-charcoal">{item.q}</dt>
                <dd className="mt-1.5 text-[0.88rem] leading-relaxed text-charcoal-soft">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="text-[0.88rem]">
        Still stuck?{" "}
        <Link href="/contact" className="text-navy underline">
          Contact the team
        </Link>{" "}
        or open a ticket from your dashboard.
      </p>
    </LegalPage>
  );
}
