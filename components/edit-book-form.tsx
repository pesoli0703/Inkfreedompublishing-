"use client";

import { useActionState } from "react";
import { updateBookAction, type ActionState } from "@/app/author/actions";
import { CATEGORY_SECTIONS } from "@/lib/category-sections";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export type EditableBook = {
  id: string;
  title: string;
  subtitle: string | null;
  hook: string | null;
  categoryId: string | null;
  language: string | null;
  pageCount: number | null;
  description: string[];
  excerptLabel: string | null;
  excerptBody: string[];
  themes: string[];
  rightsDeclared: boolean;
  coverPath: string | null;
  formats: {
    format: "paperback" | "hardcover" | "ebook";
    priceMajor: number | null;
    available: boolean;
  }[];
};

const FORMAT_ORDER = ["paperback", "hardcover", "ebook"] as const;

export function EditBookForm({
  book,
  categories,
}: {
  book: EditableBook;
  categories: { id: string; name: string; section: string }[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateBookAction,
    null,
  );

  const sections = CATEGORY_SECTIONS.map((section) => ({
    section,
    shelves: categories.filter((category) => category.section === section.slug),
  })).filter((entry) => entry.shelves.length > 0);

  const unfiled = categories.filter(
    (category) => !CATEGORY_SECTIONS.some((section) => section.slug === category.section),
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="book_id" value={book.id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Title
          <input name="title" required defaultValue={book.title} className={field} />
        </label>
        <label className={label}>
          Subtitle
          <input name="subtitle" defaultValue={book.subtitle ?? ""} className={field} />
        </label>
        <label className={label}>
          Category
          <select name="category_id" defaultValue={book.categoryId ?? ""} className={field}>
            <option value="">Choose a shelf</option>
            {sections.map(({ section, shelves }) => (
              <optgroup key={section.slug} label={section.name}>
                {shelves.map((shelf) => (
                  <option key={shelf.id} value={shelf.id}>
                    {shelf.name}
                  </option>
                ))}
              </optgroup>
            ))}
            {unfiled.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Language
          <input name="language" defaultValue={book.language ?? "English"} className={field} />
        </label>
      </div>

      <label className={label}>
        One-sentence hook
        <input name="hook" maxLength={160} defaultValue={book.hook ?? ""} className={field} />
      </label>

      <label className={label}>
        Description (blank line between paragraphs)
        <textarea
          name="description"
          rows={7}
          required
          defaultValue={book.description.join("\n\n")}
          className={field}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Excerpt label
          <input name="excerpt_label" defaultValue={book.excerptLabel ?? ""} className={field} />
        </label>
        <label className={label}>
          Themes (comma separated)
          <input name="themes" defaultValue={book.themes.join(", ")} className={field} />
        </label>
      </div>

      <label className={label}>
        Excerpt
        <textarea
          name="excerpt_body"
          rows={4}
          defaultValue={book.excerptBody.join("\n\n")}
          className={field}
        />
      </label>

      <fieldset className="border border-line p-5">
        <legend className="px-2 text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
          Formats and NGN base prices
        </legend>
        <p className="mb-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
          Prices are entered in naira. Other currencies are converted from this
          base using the platform FX table — you never set converted prices.
        </p>
        <div className="space-y-3">
          {FORMAT_ORDER.map((format) => {
            const current = book.formats.find((entry) => entry.format === format);
            return (
              <div key={format} className="flex flex-wrap items-center gap-4">
                <label className="flex w-40 items-center gap-2 text-[0.85rem] text-charcoal">
                  <input
                    type="checkbox"
                    name={`format_${format}`}
                    defaultChecked={current?.available ?? false}
                  />
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </label>
                <input
                  name={`price_${format}`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Price in ₦"
                  defaultValue={current?.priceMajor ?? ""}
                  className="w-40 border border-line bg-ivory/60 px-3 py-2 text-sm"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Page count
          <input
            name="page_count"
            type="number"
            min="1"
            defaultValue={book.pageCount ?? ""}
            className={field}
          />
        </label>
        <label className={label}>
          {book.coverPath ? "Replace cover image" : "Cover image (JPG or PNG)"}
          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className={field} />
        </label>
      </div>

      <label className="flex items-start gap-3 text-[0.82rem] leading-relaxed text-charcoal">
        <input
          type="checkbox"
          name="rights"
          required
          defaultChecked={book.rightsDeclared}
          className="mt-1"
        />
        I confirm I hold the rights to publish this work and that it contains no
        material I am not licensed to use.
      </label>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <SubmitButton label="Save changes" pendingLabel="Saving…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
