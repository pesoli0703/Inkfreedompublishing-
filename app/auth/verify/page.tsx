import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to finish creating your account.",
};

export default function VerifyPage() {
  return (
    <section className="container-editorial py-16 sm:py-24">
      <div className="mx-auto max-w-xl border border-line bg-white p-8 sm:p-10">
        <p className="eyebrow text-gold-deep">One more step</p>
        <h1 className="mt-4 font-display text-3xl leading-tight text-navy sm:text-4xl">
          Check your inbox
        </h1>
        <p className="mt-5 text-[0.92rem] leading-relaxed text-charcoal-soft">
          We sent a verification link to the address you registered with. Open
          it to activate your account, then sign in. If the message has not
          arrived within a few minutes, check your spam folder before requesting
          another.
        </p>
        <p className="mt-4 text-[0.85rem] leading-relaxed text-charcoal-soft">
          Verification emails are only sent when an email provider is configured
          for the platform. Until then, an account may be created without
          receiving a message — this page does not claim an email was
          delivered.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signin"
            className="bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
          >
            Go to sign in
          </Link>
          <Link
            href="/contact"
            className="border border-line px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
          >
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
