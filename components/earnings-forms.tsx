"use client";

import { useActionState } from "react";
import {
  requestWithdrawalAction,
  savePayoutAccountAction,
  type ActionState,
} from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function PayoutAccountForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(savePayoutAccountAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          Bank
          <input name="bank_name" required className={field} />
        </label>
        <label className={label}>
          Account name
          <input name="account_name" required className={field} />
        </label>
        <label className={label}>
          Account number
          <input name="account_number" required minLength={6} className={field} />
        </label>
      </div>
      <p className="text-[0.72rem] leading-relaxed text-charcoal-soft">
        Only the last four digits are stored. Payouts are made manually to this
        account while the gateway is in manual-payout mode.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Save payout account" />
        <p aria-live="polite" className="text-[0.78rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

export function WithdrawalForm({ accounts }: { accounts: { id: string; label: string }[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(requestWithdrawalAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Amount (₦)
          <input name="amount" type="number" min="5000" step="1" required className={field} />
        </label>
        <label className={label}>
          Pay into
          <select name="payout_account_id" required className={field}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Request withdrawal" />
        <p aria-live="polite" className="text-[0.78rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
