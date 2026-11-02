"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";

type Offer = {
  bookFormatId: string;
  format: string;
  currency: string;
  priceMinor: number;
  source: string;
};

const FORMAT_LABEL: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "Ebook",
};

export function LivePurchasePanel({
  title,
  offers,
  currencies,
}: {
  title: string;
  offers: Offer[];
  currencies: string[];
}) {
  const available = useMemo(() => currencies.filter((code) => offers.some((offer) => offer.currency === code)), [currencies, offers]);
  const [currency, setCurrency] = useState(available[0] ?? "NGN");
  const [format, setFormat] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const offersForCurrency = offers.filter((offer) => offer.currency === currency);
  const selected = format ?? offersForCurrency[0] ?? null;

  async function checkout() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const orderResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          items: [{ bookFormatId: selected.bookFormatId, quantity: 1 }],
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error ?? "Could not create the order.");

      const payResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId }),
      });
      const payment = await payResponse.json();

      if (!payResponse.ok) {
        // The order exists; payments may simply be disabled. Be explicit.
        setMessage(
          `${payment.error ?? "Payment could not be opened."} Your order ${order.orderNumber} is saved in your dashboard${payResponse.status === 503 ? " and no payment was taken" : ""}.`,
        );
        router.refresh();
        return;
      }

      if (payment.link) {
        window.location.href = payment.link as string;
        return;
      }
      setMessage("Order created, but no checkout link was returned.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-line bg-white p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-charcoal-soft">Price</p>
          <p className="mt-1 font-display text-3xl text-navy">
            {selected ? formatMoney(selected.priceMinor, currency) : "—"}
          </p>
        </div>
        <label className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
          Currency
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setFormat(null);
            }}
            className="mt-1 block border border-line bg-white px-2 py-1 text-[0.75rem] text-navy"
          >
            {available.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="eyebrow text-charcoal-soft">Format</legend>
        <div className="mt-3 space-y-2">
          {offersForCurrency.map((offer) => (
            <label
              key={offer.bookFormatId}
              className={`flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-sm transition-colors ${
                selected?.bookFormatId === offer.bookFormatId
                  ? "border-navy bg-navy/3"
                  : "border-line hover:border-navy/35"
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="format"
                  checked={selected?.bookFormatId === offer.bookFormatId}
                  onChange={() => {
                    setFormat(offer);
                    setMessage(null);
                  }}
                  className="h-3.5 w-3.5 accent-[#101C32]"
                />
                <span className="text-charcoal">{FORMAT_LABEL[offer.format] ?? offer.format}</span>
              </span>
              <span className="text-charcoal-soft">{formatMoney(offer.priceMinor, currency)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={checkout}
        disabled={busy || !selected}
        className="mt-6 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
      >
        {busy ? "Preparing…" : "Proceed to checkout"}
      </button>

      <p aria-live="polite" className="mt-4 text-xs leading-relaxed text-charcoal">
        {message ??
          `The amount is fixed in ${currency} when the order is created. Payment is confirmed only after the gateway response is verified on our server.`}
      </p>

      <ul className="mt-6 space-y-2 border-t border-line pt-5 text-[0.78rem] text-charcoal-soft">
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          {title} · 90% of the listed price goes to the author
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          Downloads are signed, personal and valid for seven days per request
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          Refunds follow the published Refund Policy
        </li>
      </ul>
    </div>
  );
}
