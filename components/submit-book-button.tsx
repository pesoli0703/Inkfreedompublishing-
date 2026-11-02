"use client";

import { useTransition } from "react";
import { submitBookAction } from "@/app/author/actions";

export function SubmitBookButton({ bookId, label = "Submit for review" }: { bookId: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => submitBookAction(bookId))}
      className="bg-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
    >
      {pending ? "Submitting…" : label}
    </button>
  );
}
