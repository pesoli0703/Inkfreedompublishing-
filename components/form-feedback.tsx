"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel = "Saving…",
  className,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
