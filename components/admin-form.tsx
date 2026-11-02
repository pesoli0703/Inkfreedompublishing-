"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionState } from "@/app/admin/actions";

/**
 * Thin client wrapper so every admin mutation shows its own result without
 * shipping a bespoke client component per table row.
 */
export function AdminForm({
  action,
  children,
  submitLabel,
  variant = "primary",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  variant?: "primary" | "quiet" | "danger";
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  const styles = {
    primary:
      "bg-navy px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft",
    quiet:
      "border border-line px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.16em] text-navy uppercase hover:border-navy",
    danger:
      "border border-red-300 px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.16em] text-red-700 uppercase hover:bg-red-50",
  } as const;

  return (
    <form action={formAction} className="space-y-3">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={styles[variant]}>
          {submitLabel}
        </button>
        {state && (
          <span
            aria-live="polite"
            className={`text-[0.75rem] ${state.ok ? "text-charcoal" : "text-red-700"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}

export const adminField =
  "w-full border border-line bg-white px-3 py-2 text-[0.82rem] text-charcoal outline-none focus:border-gold-deep";
