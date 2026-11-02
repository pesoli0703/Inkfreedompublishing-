"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  finalizeCoverUploadAction,
  prepareCoverUploadAction,
} from "@/app/author/upload-actions";
import { COVER_ACCEPT, contentTypeFor } from "@/lib/ebooks";

/** Replaces the shop cover. Same signed-ticket path as the eBook file. */
export function CoverUploadForm({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const cover = new FormData(form).get("cover");
    if (!(cover instanceof File) || cover.size === 0) {
      setState({ ok: false, message: "Choose a JPG, PNG or WebP image." });
      return;
    }

    setBusy(true);
    setState(null);
    try {
      const prepared = await prepareCoverUploadAction({
        bookId,
        cover: { name: cover.name, size: cover.size },
      });
      if (!prepared.ok) {
        setState({ ok: false, message: prepared.message });
        return;
      }

      const storage = createClient();
      const upload = await storage.storage
        .from(prepared.ticket.bucket)
        .uploadToSignedUrl(prepared.ticket.path, prepared.ticket.token, cover, {
          contentType: contentTypeFor(cover.name),
        });
      if (upload.error) {
        setState({ ok: false, message: `The cover did not upload: ${upload.error.message}` });
        return;
      }

      const finalized = await finalizeCoverUploadAction({
        bookId,
        path: prepared.ticket.path,
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 border-t border-line pt-5">
      <label className="block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
        Replace the cover (JPG, PNG or WebP, max 10 MB)
        <input
          type="file"
          name="cover"
          required
          disabled={busy}
          accept={COVER_ACCEPT}
          className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-2.5 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="border border-navy px-4 py-2.5 text-[0.66rem] font-semibold tracking-[0.14em] text-navy uppercase transition-colors hover:bg-navy hover:text-ivory disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload cover"}
        </button>
        <p aria-live="polite" className="text-[0.78rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
