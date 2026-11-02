"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  finalizeEbookUploadAction,
  prepareEbookUploadAction,
} from "@/app/author/upload-actions";
import {
  COVER_ACCEPT,
  EBOOK_ACCEPT,
  contentTypeFor,
  type PriceCurrency,
} from "@/lib/ebooks";

const field =
  "mt-2 w-full border border-line bg-white px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

type Stage = "idle" | "preparing" | "cover" | "ebook" | "saving" | "done";

const STAGE_TEXT: Record<Exclude<Stage, "idle" | "done">, string> = {
  preparing: "Preparing your upload…",
  cover: "Uploading the cover image…",
  ebook: "Uploading the eBook file… keep this page open.",
  saving: "Saving your book…",
};

export function EbookUploadForm({
  authorName,
  categories,
  currencies,
}: {
  authorName: string;
  categories: { id: string; name: string; section: string }[];
  currencies: PriceCurrency[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [orphanBookId, setOrphanBookId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);

  const busy = stage !== "idle" && stage !== "done";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    // `new FormData(form)` never includes the button that submitted it, so the
    // intent has to come from the submitter itself.
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: "submit" | "draft" = submitter?.value === "draft" ? "draft" : "submit";

    const cover = data.get("cover");
    const ebook = data.get("ebook");

    setError(null);

    if (!(cover instanceof File) || cover.size === 0) {
      setError("Attach a cover image (JPG, PNG or WebP).");
      return;
    }
    if (!(ebook instanceof File) || ebook.size === 0) {
      setError("Attach the eBook file — a PDF or an EPUB.");
      return;
    }

    const details = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      authorName: String(data.get("author_name") ?? ""),
      categoryId: String(data.get("category_id") ?? ""),
      price: String(data.get("price") ?? ""),
      currency: String(data.get("currency") ?? "NGN"),
      cover: { name: cover.name, size: cover.size },
      ebook: { name: ebook.name, size: ebook.size },
    };

    try {
      // 1. The server creates the draft, the price and two single-path tickets.
      setStage("preparing");
      const prepared = await prepareEbookUploadAction({ ...details, intent });
      if (!prepared.ok) {
        setStage("idle");
        setError(prepared.message);
        return;
      }
      setOrphanBookId(prepared.bookId);

      const storage = createClient();

      // 2. The browser uploads the bytes straight to private Storage. They never
      //    pass through the server, so file size is not capped at 1 MB.
      setStage("cover");
      const coverUpload = await storage.storage
        .from(prepared.cover.bucket)
        .uploadToSignedUrl(prepared.cover.path, prepared.cover.token, cover, {
          contentType: contentTypeFor(cover.name),
        });
      if (coverUpload.error) {
        setStage("idle");
        setError(`The cover did not upload: ${coverUpload.error.message}`);
        return;
      }

      setStage("ebook");
      const fileUpload = await storage.storage
        .from(prepared.ebook.bucket)
        .uploadToSignedUrl(prepared.ebook.path, prepared.ebook.token, ebook, {
          contentType: contentTypeFor(ebook.name),
        });
      if (fileUpload.error) {
        setStage("idle");
        setError(`The eBook file did not upload: ${fileUpload.error.message}`);
        return;
      }

      // 3. The server re-reads both objects from Storage before linking them.
      setStage("saving");
      const finalized = await finalizeEbookUploadAction({
        bookId: prepared.bookId,
        coverPath: prepared.cover.path,
        ebookPath: prepared.ebook.path,
        ebookName: ebook.name,
        intent,
      });
      if (!finalized.ok) {
        setStage("idle");
        setError(finalized.message);
        return;
      }

      setStage("done");
      startTransition(() => {
        router.push(finalized.redirectTo);
        router.refresh();
      });
    } catch (caught) {
      setStage("idle");
      setError(
        caught instanceof Error
          ? `${caught.message} ${
              orphanBookId
                ? "Your draft was created — open it from My eBooks to attach the file again."
                : ""
            }`
          : "Something went wrong while uploading. Please try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
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
            <input name="author_name" defaultValue={authorName} maxLength={120} className={field} />
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
              {fileName ?? "This is what the buyer downloads. Stored privately, up to 200 MB."}
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

        {error && (
          <div
            role="alert"
            className="border border-red-700/30 bg-red-50 px-4 py-3 text-[0.82rem] leading-relaxed text-red-900"
          >
            <p>{error}</p>
            {orphanBookId && (
              <p className="mt-2">
                <Link href={`/author/books/${orphanBookId}`} className="underline">
                  Open the saved draft
                </Link>{" "}
                — everything except the file is already saved.
              </p>
            )}
          </div>
        )}

        {busy && (
          <div aria-live="polite" className="border border-gold/60 bg-ivory px-4 py-3">
            <p className="text-[0.8rem] text-charcoal">{STAGE_TEXT[stage as keyof typeof STAGE_TEXT]}</p>
            <div className="mt-2 h-1 w-full overflow-hidden bg-line">
              <div
                className="h-full bg-gold transition-all duration-500"
                style={{
                  width:
                    stage === "preparing"
                      ? "20%"
                      : stage === "cover"
                        ? "45%"
                        : stage === "ebook"
                          ? "80%"
                          : "95%",
                }}
              />
            </div>
            <p className="mt-2 text-[0.72rem] text-charcoal-soft">
              Large files take a while. Please do not close this tab.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={busy}
            className="bg-navy px-6 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Submit for approval"}
          </button>
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={busy}
            className="border border-line px-6 py-3.5 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy disabled:opacity-60"
          >
            Save as draft
          </button>
        </div>
      </fieldset>

      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        An administrator reads every submission before it goes on sale. You will
        see the decision, and any note, on your dashboard.
      </p>
    </form>
  );
}
