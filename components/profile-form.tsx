"use client";

import { useActionState } from "react";
import { updateProfileAction, type ActionState } from "@/app/dashboard/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function ProfileForm({
  profile,
  currencies,
}: {
  profile: {
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
    country_code: string | null;
    preferred_currency: string | null;
    marketing_opt_in: boolean | null;
  };
  currencies: { code: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Full name
          <input name="full_name" defaultValue={profile.full_name ?? ""} className={field} />
        </label>
        <label className={label}>
          Display name
          <input name="display_name" defaultValue={profile.display_name ?? ""} className={field} />
        </label>
        <label className={label}>
          Phone
          <input name="phone" defaultValue={profile.phone ?? ""} className={field} placeholder="+234…" />
        </label>
        <label className={label}>
          Country (ISO 2)
          <input
            name="country_code"
            maxLength={2}
            defaultValue={profile.country_code ?? "NG"}
            className={field}
          />
        </label>
        <label className={label}>
          Preferred currency
          <select name="preferred_currency" defaultValue={profile.preferred_currency ?? "NGN"} className={field}>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-3 pt-6 text-[0.82rem] text-charcoal">
          <input
            type="checkbox"
            name="marketing_opt_in"
            defaultChecked={profile.marketing_opt_in ?? false}
            className="mt-1"
          />
          Send me occasional catalogue news. Order and security notices are
          always sent.
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Save changes" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
