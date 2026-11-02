"use client";

import { useState, useTransition } from "react";
import { submitBookAction } from "@/app/author/actions";

/**
 * Submits a draft for review.
 *
 * The database is the authority on whether a book may be submitted — it checks
 * the cover, the description, the price and the eBook file. When it refuses, the
 * reason is shown here instead of failing silently.
 */
export function SubmitBookButton({
  bookId,
  label = "Submit for review",
  disabled = false,
  disabledReason,
}: {
  bookId: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <span className="text-right text-[0.72rem] leading-relaxed text-charcoal-soft">
        {disabledReason ?? "Complete the book before submitting."}
      </span>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await submitBookAction(bookId);
            if (result && !result.ok) setError(result.message);
          })
        }
        className="bg-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
      >
        {pending ? "Submitting…" : label}
      </button>
      {error && (
        <p className="mt-2 max-w-xs text-[0.72rem] leading-relaxed text-red-700">{error}</p>
      )}
    </div>
  );
}
