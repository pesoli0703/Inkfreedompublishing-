"use client";

import { useActionState } from "react";
import { startPublishingAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

const countries = [
  ["NG", "Nigeria"],
  ["GH", "Ghana"],
  ["KE", "Kenya"],
  ["ZA", "South Africa"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["IE", "Ireland"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["NL", "Netherlands"],
  ["IN", "India"],
  ["JM", "Jamaica"],
  ["TT", "Trinidad and Tobago"],
  ["OT", "Another country"],
];

export function BecomeAuthorForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    startPublishingAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Pen name (shown on your books)
          <input
            name="pen_name"
            required
            minLength={2}
            defaultValue={defaultName ?? ""}
            className={field}
            autoComplete="name"
          />
        </label>
        <label className={label}>
          Country
          <select name="country_code" defaultValue="NG" className={field}>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={label}>
        One-line description (optional)
        <input
          name="tagline"
          maxLength={120}
          placeholder="Short stories about Lagos and the sea"
          className={field}
        />
      </label>

      <label className={label}>
        What do you write? (optional)
        <input name="writing_in" placeholder="Literary fiction" className={field} />
      </label>

      <label className={label}>
        Author biography (optional — you can add this later)
        <textarea name="bio" rows={4} className={field} />
      </label>

      <div className="border-t border-line pt-5">
        <SubmitButton label="Start publishing" pendingLabel="Opening your workspace…" />
        <p aria-live="polite" className="mt-3 text-[0.8rem]">
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-charcoal-soft">
          No application fee, no publishing contract, no waiting for an editor to
          accept you. You keep the rights to your work; we take 10% of each sale
          and you keep 90%. Every book is checked by an administrator before it
          goes on sale.
        </p>
      </div>
    </form>
  );
}
