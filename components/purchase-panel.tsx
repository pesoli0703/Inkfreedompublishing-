"use client";

import { useState } from "react";
import type { Book } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";

/**
 * Purchase interface. Checkout is deliberately not wired up: no payment
 * provider is connected, and nothing here pretends otherwise.
 */
export function PurchasePanel({ book }: { book: Book }) {
  const firstAvailable = book.formats.find((format) => format.available);
  const [selected, setSelected] = useState(firstAvailable?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const active = book.formats.find((format) => format.id === selected);

  return (
    <div className="border border-line bg-white p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-charcoal-soft">Price</p>
          <p className="mt-1 font-display text-3xl text-navy">
            {active && active.available ? formatPrice(active.price) : "—"}
          </p>
        </div>
        <p className="text-[0.68rem] tracking-[0.14em] text-charcoal-soft uppercase">
          incl. VAT
        </p>
      </div>

      <fieldset className="mt-6">
        <legend className="eyebrow text-charcoal-soft">Format</legend>
        <div className="mt-3 space-y-2">
          {book.formats.map((format) => {
            const disabled = !format.available;
            return (
              <label
                key={format.id}
                className={`flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-sm transition-colors ${
                  selected === format.id
                    ? "border-navy bg-navy/3"
                    : "border-line hover:border-navy/35"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="format"
                    value={format.id}
                    checked={selected === format.id}
                    disabled={disabled}
                    onChange={() => {
                      setSelected(format.id);
                      setMessage(null);
                    }}
                    className="h-3.5 w-3.5 accent-[#101C32]"
                  />
                  <span className="text-charcoal">{format.label}</span>
                </span>
                <span className="text-charcoal-soft">
                  {disabled ? "Coming soon" : formatPrice(format.price)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() =>
          setMessage(
            "Checkout isn’t live in this preview build. Payments (Flutterwave) are not connected, so no order was created and no payment was taken.",
          )
        }
        className="mt-6 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
      >
        Proceed to checkout
      </button>

      <button
        type="button"
        onClick={() =>
          setMessage(
            "Reading lists need an account, and accounts aren’t connected yet. Nothing was saved.",
          )
        }
        className="mt-2 w-full border border-navy/20 px-6 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
      >
        Save to reading list
      </button>

      <p
        aria-live="polite"
        className={`mt-4 text-xs leading-relaxed ${
          message ? "text-charcoal" : "text-charcoal-soft"
        }`}
      >
        {message ??
          "Checkout and payments are not connected yet. This panel shows the intended purchase flow."}
      </p>

      <ul className="mt-6 space-y-2 border-t border-line pt-5 text-[0.78rem] text-charcoal-soft">
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          Ships in 3–5 working days once fulfilment is live
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          Direct from the publisher — royalties go to the author
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
          Returns policy is still in draft
        </li>
      </ul>
    </div>
  );
}
