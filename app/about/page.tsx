import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "About the Press",
  description:
    "INKFREEDOMPUBLISHING is an independent publishing house and digital marketplace for considered books.",
};

export const revalidate = 60;

const principles = [
  {
    title: "The book comes first",
    body: "Editorial care, good typesetting and a cover that earns its place. We would rather publish fewer titles than rush a list.",
  },
  {
    title: "Authors stay authors",
    body: "Writers should be writing, not chasing production. We handle design, production and the marketplace side.",
  },
  {
    title: "Clear terms",
    body: "Rights, royalties and responsibilities are written down before production starts — not after.",
  },
  {
    title: "No manufactured hype",
    body: "We don’t publish invented reviews, borrowed praise or inflated figures. If a number appears on this site, it will be real.",
  },
];

type StatusItem = {
  label: string;
  value: string;
  live: boolean;
};

/**
 * Status is read from the running deployment, not hard-coded, so this panel
 * cannot drift out of date the way a static table does.
 */
async function readStatus(): Promise<StatusItem[]> {
  const catalogueLive = isSupabaseConfigured;
  const storageLive = serviceRoleConfigured();

  let accounts: StatusItem = {
    label: "Accounts & sign in",
    value: "Not configured on this deployment",
    live: false,
  };
  let payments: StatusItem = {
    label: "Payments & checkout",
    value: "Not configured on this deployment",
    live: false,
  };

  if (catalogueLive && storageLive) {
    try {
      const admin = createAdminClient();
      const [{ count: accountsCount }, { data: settings }] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("platform_settings").select("payments_mode").maybeSingle(),
      ]);

      accounts = {
        label: "Accounts & sign in",
        value: `Live · ${accountsCount ?? 0} ${accountsCount === 1 ? "account" : "accounts"}`,
        live: true,
      };

      const mode = String(settings?.payments_mode ?? "disabled");
      payments = {
        label: "Payments & checkout",
        value:
          mode === "disabled"
            ? "Configured — switched off until sales open"
            : mode === "live"
              ? "Live — cards accepted"
              : "Sandbox — test payments only",
        live: mode !== "disabled",
      };
    } catch {
      // Leave the honest "not configured" wording if the read fails.
    }
  }

  return [
    {
      label: "Website & catalogue",
      value: catalogueLive ? "Live" : "Not configured",
      live: catalogueLive,
    },
    accounts,
    {
      label: "Author sign-ups & uploads",
      value: catalogueLive ? "Live" : "Not configured",
      live: catalogueLive,
    },
    payments,
    {
      label: "Newsletter delivery",
      value: "Not connected",
      live: false,
    },
  ];
}

export default async function AboutPage() {
  const status = await readStatus();

  return (
    <>
      <section className="border-b border-line bg-white paper-texture">
        <div className="container-editorial py-12 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">About</span>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">About the press</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.04] text-navy sm:text-5xl lg:text-[3.4rem]">
                An independent press,
                <span className="block italic text-gold-deep">
                  built for the long list.
                </span>
              </h1>
              <div className="mt-7 space-y-5 text-[0.97rem] leading-relaxed text-charcoal-soft">
                <p>
                  INKFREEDOMPUBLISHING exists to publish books that would
                  otherwise fall between the big houses and the self-published
                  shelf: work with a real readership, made to a standard the
                  author can be proud of.
                </p>
                <p>
                  We are building both halves of that in one place — the
                  editorial and production work of a publishing house, and a
                  digital marketplace where readers can buy directly from the
                  publisher and the author is paid properly.
                </p>
                <p>
                  Authors apply from their dashboard, upload the manuscript and
                  cover themselves, and every title is read by an editor before
                  it appears in the catalogue. The books you find here are the
                  real catalogue — every title, price and author profile comes
                  from the same records that run the marketplace.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border border-line bg-ivory p-7">
                <p className="eyebrow text-charcoal-soft">What is live today</p>
                <h2 className="sr-only">Build status</h2>
                <ul className="mt-5 divide-y divide-line text-sm">
                  {status.map((item) => (
                    <li key={item.label} className="flex items-start justify-between gap-4 py-3.5">
                      <span className="text-charcoal">{item.label}</span>
                      <span
                        className={`text-right text-[0.72rem] tracking-[0.04em] ${
                          item.live ? "text-gold-deep" : "text-charcoal-soft"
                        }`}
                      >
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-line pt-4 text-[0.72rem] leading-relaxed text-charcoal-soft">
                  We would rather show you exactly what is live than imply a
                  connection that does not exist. Customer payments stay switched
                  off until the purchase and download journey has been verified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-16 sm:py-20">
        <SectionHeading
          eyebrow="How we work"
          title="Four principles"
          description="The editorial position of the press, in plain terms."
        />
        <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2">
          {principles.map((principle, index) => (
            <div key={principle.title} className="bg-ivory p-7 sm:p-9">
              <span className="font-display text-sm tracking-[0.2em] text-gold-deep">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-xl text-navy">
                {principle.title}
              </h3>
              <p className="mt-2.5 text-[0.9rem] leading-relaxed text-charcoal-soft">
                {principle.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-navy text-ivory">
        <div className="container-editorial grid gap-10 py-16 sm:py-20 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow text-gold-soft">The opportunity</p>
            <h2 className="mt-4 max-w-xl font-display text-3xl leading-[1.12] sm:text-4xl">
              If you have a finished manuscript, we would like to read it.
            </h2>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-ivory/65">
              We are opening the list across fiction, poetry, essays, memoir and
              children’s books. Submissions are read by an editor and answered
              either way.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Link
              href="/publish"
              className="bg-gold px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:bg-gold-soft"
            >
              How publishing works
            </Link>
            <Link
              href="/books"
              className="border border-white/25 px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:border-gold hover:text-gold-soft"
            >
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
