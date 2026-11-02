"use client";

import { useActionState } from "react";
import { updateBookAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

export type EditableBook = {
  id: string;
  title: string;
  description: string[];
  categoryId: string | null;
  priceMajor: number | null;
  coverPath: string | null;
};

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function EditBookForm({
  book,
  categories,
}: {
  book: EditableBook;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateBookAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="book_id" value={book.id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Title
          <input name="title" required defaultValue={book.title} className={field} />
        </label>
        <label className={label}>
          Category
          <select name="category_id" defaultValue={book.categoryId ?? ""} className={field}>
            <option value="">Choose a shelf</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={label}>
        Description (blank line between paragraphs)
        <textarea
          name="description"
          rows={6}
          required
          defaultValue={book.description.join("\n\n")}
          className={field}
        />
      </label>

      <label className={label}>
        Selling price (NGN)
        <input
          name="price"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={book.priceMajor ?? ""}
          className={field}
        />
      </label>

      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        The cover and the eBook file are changed in the panels below, so a large
        upload never has to be sent twice.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Save changes" pendingLabel="Saving…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
