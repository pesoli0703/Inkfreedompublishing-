"use client";

import { useActionState } from "react";
import { replaceEbookFileAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";
import { EBOOK_ACCEPT } from "@/lib/ebooks";

/**
 * Replace the eBook file.
 *
 * One input, because there is one product: the PDF or EPUB a buyer downloads.
 * The file lands in the private `book-files` bucket and is only ever served
 * through a signed link after a verified purchase.
 */
export function BookFileForm({ bookId }: { bookId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    replaceEbookFileAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="book_id" value={bookId} />
      <label className="block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
        PDF or EPUB (max 200 MB)
        <input
          type="file"
          name="ebook"
          required
          accept={EBOOK_ACCEPT}
          className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-2.5 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Upload eBook file" pendingLabel="Uploading…" />
        <p aria-live="polite" className="text-[0.78rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
