"use client";

import { useActionState } from "react";
import { updateBookAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";
import { EBOOK_ACCEPT, COVER_ACCEPT } from "@/lib/ebooks";

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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Replace cover (optional)
          <input type="file" name="cover" accept={COVER_ACCEPT} className={field} />
        </label>
        <label className={label}>
          Replace eBook file (optional)
          <input type="file" name="ebook" accept={EBOOK_ACCEPT} className={field} />
        </label>
      </div>
      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        Leave the file fields empty to keep what is already uploaded. The eBook
        file is what a buyer downloads; the cover is only for the bookstore.
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
