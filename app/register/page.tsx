import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a reader account to buy and download books, or apply to publish as an author.",
};

const steps = [
  {
    title: "Verify your email",
    body: "A verification link is sent once an email provider is configured. Until then no email claim is made.",
  },
  {
    title: "Buy or publish",
    body: "Readers can buy immediately. To sell, choose a pen name — your author workspace opens straight away and your first book can be uploaded the same day.",
  },
  {
    title: "Keep your library",
    body: "Purchases stay in your library permanently, with downloads available for seven days at a time.",
  },
];

export default function RegisterPage() {
  return (
    <section className="container-editorial py-12 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
        <Link href="/" className="transition-colors hover:text-navy">
          Home
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-navy">Create account</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-deep">Registration</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.06] text-navy sm:text-5xl">
            Open an account
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-charcoal-soft">
            One account covers buying, reading and — if your application is
            approved — publishing. You can browse the catalogue without an
            account.
          </p>

          <ol className="mt-9 space-y-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="mt-0.5 font-display text-lg text-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.9rem] font-medium text-navy">{step.title}</p>
                  <p className="mt-1 text-[0.85rem] leading-relaxed text-charcoal-soft">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <Suspense fallback={null}>
            <AuthForm initialMode="create" />
          </Suspense>
          <p className="mt-6 text-[0.8rem] leading-relaxed text-charcoal-soft">
            By creating an account you accept the{" "}
            <Link href="/terms" className="border-b border-gold/60 text-navy hover:border-navy">
              Terms of Use
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="border-b border-gold/60 text-navy hover:border-navy">
              Privacy Policy
            </Link>
            . Author applicants also accept the{" "}
            <Link
              href="/author-agreement"
              className="border-b border-gold/60 text-navy hover:border-navy"
            >
              Author Agreement
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
