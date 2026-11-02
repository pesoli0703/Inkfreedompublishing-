import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account unavailable" };

export default function SuspendedPage() {
  return (
    <section className="container-editorial py-16 sm:py-24">
      <div className="mx-auto max-w-xl border border-line bg-white p-8 sm:p-10">
        <p className="eyebrow text-gold-deep">Account status</p>
        <h1 className="mt-4 font-display text-3xl text-navy">
          This account is not currently active
        </h1>
        <p className="mt-5 text-[0.92rem] leading-relaxed text-charcoal-soft">
          Access to the dashboards is paused for this account. Existing
          purchases are not deleted. Contact support and we will explain the
          status and what is needed to restore access.
        </p>
      </div>
    </section>
  );
}
