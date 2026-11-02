"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEbookAction, type ActionState } from "@/app/author/actions";
import {
  COVER_ACCEPT,
  EBOOK_ACCEPT,
  type PriceCurrency,
} from "@/lib/ebooks";

const field =
  "mt-2 w-full border border-line bg-white px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function EbookUploadForm({
  authorName,
  categories,
  currencies,
}: {
  authorName: string;
  categories: { id: string; name: string; section: string }[];
  currencies: PriceCurrency[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEbookAction,
    null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Book title
          <input
            name="title"
            required
            minLength={2}
            maxLength={200}
            className={field}
            placeholder="The Weight of Water"
          />
        </label>
        <label className={label}>
          Author name
          <input
            name="author_name"
            defaultValue={authorName}
            maxLength={120}
            className={field}
          />
        </label>
      </div>

      <label className={label}>
        Short description
        <textarea
          name="description"
          required
          rows={6}
          className={field}
          placeholder="What the book is about, in a few sentences. Leave a blank line between paragraphs."
        />
      </label>

      <label className={label}>
        Category
        <select name="category_id" required className={field} defaultValue="">
          <option value="">Choose a shelf</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Book cover (JPG, PNG or WebP)
          <input
            type="file"
            name="cover"
            required
            accept={COVER_ACCEPT}
            onChange={(event) => setCoverName(event.target.files?.[0]?.name ?? null)}
            className={field}
          />
          <span className="mt-2 block text-[0.72rem] font-normal tracking-normal text-charcoal-soft normal-case">
            {coverName ?? "Shown in the bookstore. This is not the book file."}
          </span>
        </label>

        <label className={label}>
          eBook file (PDF or EPUB)
          <input
            type="file"
            name="ebook"
            required
            accept={EBOOK_ACCEPT}
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
            className={field}
          />
          <span className="mt-2 block text-[0.72rem] font-normal tracking-normal text-charcoal-soft normal-case">
            {fileName ??
              "This is what the buyer downloads. Stored privately."}
          </span>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Selling price
          <input
            name="price"
            type="number"
            min="1"
            step="1"
            required
            className={field}
            placeholder="3500"
          />
        </label>
        <label className={label}>
          Currency
          <select name="currency" className={field} defaultValue={currencies[0]?.code ?? "NGN"}>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="border border-line bg-ivory px-4 py-3 text-[0.76rem] leading-relaxed text-charcoal-soft">
        You keep 90% of every sale; the platform keeps 10% before the payment
        gateway&apos;s own fee. Prices in other currencies are converted from your
        NGN base price. You grant a non-exclusive licence — the copyright stays
        yours.
      </p>

      {state && !state.ok && (
        <p className="border border-red-700/30 bg-red-50 px-4 py-3 text-[0.82rem] leading-relaxed text-red-900">
          {state.message}
        </p>
      )}

      <UploadButtons />

      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        An administrator reads every submission before it goes on sale. You will
        see the decision, and any note, on your dashboard.
      </p>
    </form>
  );
}

function UploadButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending}
        className="bg-navy px-6 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Submit for approval"}
      </button>
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="border border-line px-6 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy disabled:opacity-60"
      >
        Save as draft
      </button>
      {pending && (
        <span className="text-[0.75rem] text-charcoal-soft">
          Uploading your cover and eBook — keep this page open.
        </span>
      )}
    </div>
  );
}
