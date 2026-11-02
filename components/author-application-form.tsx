"use client";

import { useActionState } from "react";
import { applyAsAuthorAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

const interests = [
  "Literary fiction",
  "Poetry",
  "Essays & criticism",
  "Memoir",
  "Business & leadership",
  "Children & young readers",
];

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

export function AuthorApplicationForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(applyAsAuthorAction, null);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Full legal name
          <input name="full_name" required className={field} autoComplete="name" />
        </label>
        <label className={label}>
          Pen name
          <input name="pen_name" required className={field} />
        </label>
        <label className={label}>
          Country
          <select name="country_code" required defaultValue="NG" className={field}>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Writing in
          <input name="writing_in" className={field} placeholder="English" />
        </label>
      </div>

      <label className={label}>
        Biography (at least 80 characters)
        <textarea name="biography" required rows={5} minLength={80} className={field} />
      </label>

      <label className={label}>
        Tell us about the work you want to publish
        <textarea name="author_details" rows={4} className={field} />
      </label>

      <fieldset>
        <legend className={label}>Areas of interest</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {interests.map((interest) => (
            <label key={interest} className="flex items-center gap-2 text-[0.85rem] text-charcoal">
              <input type="checkbox" name="interests" value={interest} />
              {interest}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        Photograph (optional, JPG or PNG, max 5 MB)
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={field} />
      </label>

      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        By applying you confirm the work is yours to publish and you accept the{" "}
        <a href="/author-agreement" className="text-navy underline">
          Author Agreement
        </a>
        . Applications are reviewed by a person; nothing here is auto-approved.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Submit application" pendingLabel="Submitting…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
