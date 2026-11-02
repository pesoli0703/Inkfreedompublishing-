import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

type State =
  | "confirmed"
  | "pending"
  | "failed"
  | "cancelled"
  | "mismatch"
  | "unverified"
  | "unconfigured";

const COPY: Record<State, { eyebrow: string; title: string; body: string; tone: string }> = {
  confirmed: {
    eyebrow: "Payment confirmed",
    title: "Your book is in your library",
    body:
      "Flutterwave verified the payment on our server. The title is unlocked in your library, and downloads stay available for seven days from each request.",
    tone: "border-emerald-700/30 bg-emerald-50",
  },
  pending: {
    eyebrow: "Payment pending",
    title: "We are still confirming this payment",
    body:
      "The gateway has not reported a final result yet. If your account was debited, the order settles automatically as soon as Flutterwave confirms it — you do not need to pay again.",
    tone: "border-amber-600/30 bg-amber-50",
  },
  failed: {
    eyebrow: "Payment not completed",
    title: "No payment was taken",
    body:
      "Flutterwave reported this attempt as unsuccessful, so nothing was charged and no access was granted. You can retry the same order from your orders page.",
    tone: "border-red-700/30 bg-red-50",
  },
  cancelled: {
    eyebrow: "Checkout cancelled",
    title: "You left before paying",
    body:
      "The order is saved and still unpaid. Nothing was charged. You can reopen checkout for the same order whenever you are ready.",
    tone: "border-line bg-white",
  },
  mismatch: {
    eyebrow: "Needs review",
    title: "The amount or currency did not match the order",
    body:
      "We did not grant access. Please contact support with your Flutterwave reference so we can reconcile the payment before anything is released.",
    tone: "border-amber-600/30 bg-amber-50",
  },
  unverified: {
    eyebrow: "Could not verify",
    title: "We could not confirm this payment yet",
    body:
      "The redirect did not carry a usable reference. Your order is unchanged; we will settle it automatically if the gateway confirms the money arrived.",
    tone: "border-line bg-white",
  },
  unconfigured: {
    eyebrow: "Payments unavailable",
    title: "Online payment is not enabled on this deployment",
    body:
      "Flutterwave credentials are not configured here, so no payment could be taken. Nothing was charged.",
    tone: "border-line bg-white",
  },
};

const isState = (value: string | undefined): value is State =>
  !!value && Object.prototype.hasOwnProperty.call(COPY, value);

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; order?: string; number?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const state: State = isState(params.state) ? params.state : "unverified";
  const copy = COPY[state];

  return (
    <section className="container-editorial py-16 sm:py-24">
      <div className={`mx-auto max-w-2xl border ${copy.tone} p-8 sm:p-12`}>
        <p className="eyebrow text-gold-deep">{copy.eyebrow}</p>
        <h1 className="mt-4 font-display text-3xl leading-tight text-navy sm:text-4xl">{copy.title}</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-charcoal">{copy.body}</p>

        {(params.number || params.ref) && (
          <dl className="mt-7 space-y-2 border-t border-line pt-5 text-[0.8rem] text-charcoal-soft">
            {params.number ? (
              <div className="flex justify-between gap-4">
                <dt>Order</dt>
                <dd className="font-medium text-navy">{params.number}</dd>
              </div>
            ) : null}
            {params.ref ? (
              <div className="flex justify-between gap-4">
                <dt>Flutterwave reference</dt>
                <dd className="font-mono text-[0.75rem] text-navy">{params.ref}</dd>
              </div>
            ) : null}
          </dl>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {state === "confirmed" ? (
            <Link
              href="/dashboard/library"
              className="bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
            >
              Go to my library
            </Link>
          ) : null}
          <Link
            href="/dashboard/orders"
            className="border border-navy/25 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
          >
            Orders &amp; payments
          </Link>
          {state === "mismatch" || state === "pending" ? (
            <Link
              href="/contact"
              className="border border-navy/25 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
            >
              Contact support
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
