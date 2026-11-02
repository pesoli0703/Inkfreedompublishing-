"use client";

import { useActionState } from "react";
import { saveAuthorProfileAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function AuthorProfileForm({
  author,
}: {
  author: {
    pen_name: string;
    tagline: string;
    bio: string;
    based_in: string;
    writing_in: string;
    country_code: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveAuthorProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Pen name
          <input name="pen_name" defaultValue={author.pen_name} required className={field} />
        </label>
        <label className={label}>
          Tagline
          <input name="tagline" defaultValue={author.tagline} className={field} />
        </label>
        <label className={label}>
          Based in
          <input name="based_in" defaultValue={author.based_in} className={field} placeholder="Lagos, Nigeria" />
        </label>
        <label className={label}>
          Writing in
          <input name="writing_in" defaultValue={author.writing_in} className={field} placeholder="English" />
        </label>
        <label className={label}>
          Country (ISO 2)
          <input name="country_code" maxLength={2} defaultValue={author.country_code} className={field} />
        </label>
        <label className={label}>
          Portrait (max 5 MB)
          <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className={field} />
        </label>
      </div>
      <label className={label}>
        Biography
        <textarea name="bio" defaultValue={author.bio} rows={6} className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Save profile" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
