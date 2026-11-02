"use client";

import { useActionState } from "react";
import { createBookAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function NewBookForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createBookAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Title
          <input name="title" required className={field} />
        </label>
        <label className={label}>
          Subtitle
          <input name="subtitle" className={field} />
        </label>
        <label className={label}>
          Category
          <select name="category_id" className={field} required>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Language
          <input name="language" defaultValue="English" className={field} />
        </label>
      </div>

      <label className={label}>
        One-sentence hook
        <input name="hook" className={field} maxLength={160} />
      </label>

      <label className={label}>
        Description (blank line between paragraphs)
        <textarea name="description" rows={7} className={field} required />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Excerpt label
          <input name="excerpt_label" className={field} placeholder="From the opening chapter" />
        </label>
        <label className={label}>
          Themes (comma separated)
          <input name="themes" className={field} placeholder="Family, Lagos, Grief" />
        </label>
      </div>

      <label className={label}>
        Excerpt
        <textarea name="excerpt_body" rows={4} className={field} />
      </label>

      <fieldset className="border border-line p-5">
        <legend className="px-2 text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
          Formats and NGN base prices
        </legend>
        <p className="mb-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
          Enter the price in naira — for example 8500. Prices in other currencies
          are derived from this base using the daily FX table, or an admin
          override. You never set converted prices yourself.
        </p>
        <div className="space-y-3">
          {(
            [
              ["paperback", "Paperback"],
              ["hardcover", "Hardcover"],
              ["ebook", "Ebook"],
            ] as const
          ).map(([key, title]) => (
            <div key={key} className="flex flex-wrap items-center gap-4">
              <label className="flex w-40 items-center gap-2 text-[0.85rem] text-charcoal">
                <input type="checkbox" name={`format_${key}`} defaultChecked={key === "ebook"} />
                {title}
              </label>
              <input
                name={`price_${key}`}
                type="number"
                min="0"
                step="1"
                placeholder="Price in ₦"
                className="w-40 border border-line bg-ivory/60 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Page count
          <input name="page_count" type="number" min="1" className={field} />
        </label>
        <label className={label}>
          Cover image (JPG or PNG)
          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className={field} />
        </label>
      </div>

      <label className="flex items-start gap-3 text-[0.82rem] leading-relaxed text-charcoal">
        <input type="checkbox" name="rights" required className="mt-1" />
        I confirm I hold the rights to publish this work and that it contains no
        material I am not licensed to use.
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Create draft" pendingLabel="Creating…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
