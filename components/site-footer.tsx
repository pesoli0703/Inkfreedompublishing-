import Link from "next/link";
import { Wordmark } from "./brand";
import { NewsletterForm } from "./newsletter-form";

const explore = [
  { href: "/books", label: "Discover Books" },
  { href: "/categories", label: "Categories" },
  { href: "/authors", label: "Authors" },
  { href: "/about", label: "About the Press" },
];

const authority = [
  { href: "/publish", label: "How Publishing Works" },
  { href: "/publish#submit", label: "Submit a Manuscript" },
  { href: "/publish#terms", label: "Author Terms (draft)" },
  { href: "/signin", label: "Author Sign In" },
];

const legal = [
  { href: "/policies#privacy", label: "Privacy" },
  { href: "/policies#terms", label: "Terms of Use" },
  { href: "/policies#refunds", label: "Refunds & Returns" },
];

const social = ["Instagram", "X", "LinkedIn"];

export function SiteFooter() {
  return (
    <footer className="mt-0 bg-navy text-ivory">
      <div className="container-editorial pt-16 pb-10 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Wordmark tone="ivory" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ivory/65">
              An independent publishing house for writers who want their books
              made carefully — edited, designed and sold with intent.
            </p>
            <span className="gold-rule mt-7 block max-w-[9rem]" />
            <p className="mt-6 text-[0.7rem] tracking-[0.18em] text-ivory/55 uppercase">
              Lagos, Nigeria
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            <FooterColumn title="Explore" links={explore} />
            <FooterColumn title="For Authors" links={authority} />
            <FooterColumn title="Policies" links={legal} />
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow text-gold-soft">The Reading Room</h2>
            <p className="mt-4 text-sm leading-relaxed text-ivory/65">
              Occasional notes on new titles, author interviews and open
              submissions.
            </p>
            <div className="mt-5">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="eyebrow text-ivory/55">Contact</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/60">
                Enquiries and submissions:{" "}
                <span className="text-ivory/85">
                  contact details are published with the live site
                </span>
                . The contact form is not connected in this preview build.
              </p>
            </div>

            <div>
              <h2 className="eyebrow text-ivory/55">Follow</h2>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ivory/50">
                {social.map((network) => (
                  <li key={network} className="flex items-center gap-1.5">
                    {network}
                    <span className="text-[0.6rem] tracking-[0.12em] text-ivory/55 uppercase">
                      soon
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-editorial flex flex-col gap-3 py-6 text-[0.7rem] text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} INKFREEDOMPUBLISHING. All rights
            reserved.
          </p>
          <p className="text-ivory/55">
            Preview build — sample catalogue. Accounts, payments and newsletter
            are not connected.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="eyebrow text-gold-soft">{title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-ivory/65 transition-colors hover:text-ivory"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
