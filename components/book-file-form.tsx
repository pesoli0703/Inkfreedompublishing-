"use client";

import { useActionState } from "react";
import { uploadBookFileAction, type ActionState } from "@/app/author/actions";
import { SubmitButton } from "@/components/form-feedback";

export function BookFileForm({ bookId }: { bookId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(uploadBookFileAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="book_id" value={bookId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
          File type
          <select
            name="kind"
            className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm"
            defaultValue="ebook"
          >
            <option value="ebook">EPUB (ebook)</option>
            <option value="pdf">PDF edition</option>
            <option value="sample">Sample extract</option>
            <option value="interior">Print interior</option>
          </select>
        </label>
        <label className="block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
          File (max 200 MB)
          <input
            type="file"
            name="file"
            required
            accept=".epub,.pdf,.mobi,application/epub+zip,application/pdf"
            className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-2.5 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Upload file" pendingLabel="Uploading…" />
        <p aria-live="polite" className="text-[0.78rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
