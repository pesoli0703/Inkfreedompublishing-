"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  finalizeReplacementUploadAction,
  prepareReplacementUploadAction,
} from "@/app/author/upload-actions";
import { EBOOK_ACCEPT, contentTypeFor } from "@/lib/ebooks";

/**
 * Replace the eBook file.
 *
 * The browser uploads straight to the private `book-files` bucket with a
 * single-path ticket, then the server verifies the stored object and records it
 * as the current file. The bytes never travel through a Server Action, which is
 * what made uploading anything larger than a megabyte fail.
 */
export function BookFileForm({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("ebook");
    if (!(file instanceof File) || file.size === 0) {
      setState({ ok: false, message: "Choose a PDF or EPUB file." });
      return;
    }

    setBusy(true);
    setState(null);
    try {
      const prepared = await prepareReplacementUploadAction({
        bookId,
        file: { name: file.name, size: file.size },
      });
      if (!prepared.ok) {
        setState({ ok: false, message: prepared.message });
        return;
      }

      const storage = createClient();
      const upload = await storage.storage
        .from(prepared.ticket.bucket)
        .uploadToSignedUrl(prepared.ticket.path, prepared.ticket.token, file, {
          contentType: contentTypeFor(file.name),
        });
      if (upload.error) {
        setState({ ok: false, message: `The file did not upload: ${upload.error.message}` });
        return;
      }

      const finalized = await finalizeReplacementUploadAction({
        bookId,
        path: prepared.ticket.path,
        fileName: file.name,
      });
      if (!finalized.ok) {
        setState({ ok: false, message: finalized.message });
        return;
      }

      setState({ ok: true, message: finalized.message });
      form.reset();
      startTransition(() => router.refresh());
    } catch (caught) {
      setState({
        ok: false,
        message: caught instanceof Error ? caught.message : "The upload failed. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
        PDF or EPUB (max 200 MB)
        <input
          type="file"
          name="ebook"
          required
          disabled={busy}
          accept={EBOOK_ACCEPT}
          className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-2.5 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="bg-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload eBook file"}
        </button>
        <p aria-live="polite" className="text-[0.78rem]">
          {busy && <span className="text-charcoal-soft">Keep this page open.</span>}
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
