"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveBookAction, type BookFormState } from "@/lib/actions/author";
import { CATEGORIES } from "@/lib/categories";
import { coverUrl } from "@/lib/storage";
import type { Book } from "@/lib/types";
import { ErrorNote } from "./auth-form";

const MAX_COVER = 8 * 1024 * 1024;
const MAX_EBOOK = 150 * 1024 * 1024;

type Props = { book?: Book; userId: string };

export function EditionForm({ book, userId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<BookFormState>({ error: null });
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(coverUrl(book?.cover_path));
  const [format, setFormat] = useState<string>(book?.ebook_format ?? "");

  const [dragging, setDragging] = useState<"cover" | "ebook" | null>(null);

  function chooseCover(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ error: "Cover artwork must be a JPG, PNG or WebP image." });
      return;
    }
    if (file.size > MAX_COVER) {
      setState({ error: "The cover is larger than 8 MB." });
      return;
    }
    setState({ error: null });
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function chooseEbook(file: File | null) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf" && extension !== "epub") {
      setState({ error: "The ebook must be a PDF (.pdf) or an ePub (.epub)." });
      return;
    }
    if (file.size > MAX_EBOOK) {
      setState({ error: "The ebook is larger than 150 MB." });
      return;
    }
    setState({ error: null });
    setEbookFile(file);
    setFormat(extension);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const intent = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-intent") ?? "draft";

    if (!book && !ebookFile) {
      setState({ error: "Attach the ebook file — a PDF or an ePub." });
      return;
    }

    const supabase = createClient();
    let coverPath = book?.cover_path ?? "";
    let ebookPath = book?.ebook_path ?? "";
    let ebookSize = book?.ebook_size_bytes ?? 0;

    try {
      if (coverFile) {
        setBusy("Uploading cover artwork…");
        const extension = coverFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${userId}/${Date.now()}-cover.${extension}`;
        const { error } = await supabase.storage.from("covers").upload(path, coverFile, {
          cacheControl: "31536000",
          upsert: true,
          contentType: coverFile.type,
        });
        if (error) throw new Error(`Cover upload failed: ${error.message}`);
        coverPath = path;
      }

      if (ebookFile) {
        setBusy("Uploading the ebook file…");
        const extension = ebookFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
        const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("ebooks").upload(path, ebookFile, {
          upsert: true,
          contentType: extension === "epub" ? "application/epub+zip" : "application/pdf",
        });
        if (error) throw new Error(`Ebook upload failed: ${error.message}`);
        ebookPath = path;
        ebookSize = ebookFile.size;
      }

      formData.set("coverPath", coverPath);
      formData.set("ebookPath", ebookPath);
      formData.set("ebookFormat", format || book?.ebook_format || "pdf");
      formData.set("ebookSize", String(ebookSize));
      formData.set("intent", intent);
      if (book) formData.set("bookId", book.id);

      setBusy("Saving the listing…");
      startTransition(async () => {
        const result = await saveBookAction({ error: null }, formData);
        if (result?.error) {
          setState({ error: result.error });
          setBusy(null);
        }
      });
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "Upload failed." });
      setBusy(null);
    }
  }

  const working = pending || Boolean(busy);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-8">
        <section className="border border-line bg-paper-card p-6">
          <h2 className="font-display text-[1.25rem] text-ink">The listing</h2>
          <p className="mt-1 text-[0.8rem] text-ink-muted">
            What readers see on the shelf and on the book page.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Title" name="title" required defaultValue={book?.title} />
            <Field
              label="Subtitle"
              name="subtitle"
              defaultValue={book?.subtitle ?? ""}
              hint="Optional — a line beneath the title."
            />

            <label className="block">
              <span className="label mb-2 block text-ink-muted">Description</span>
              <textarea
                name="description"
                rows={7}
                defaultValue={book?.description}
                required
                minLength={40}
                placeholder="What is this book, who is it for, and why should someone spend an evening with it?"
                className="field"
              />
              <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                At least two sentences. Plain text — line breaks are preserved.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label mb-2 block text-ink-muted">Category</span>
                <select name="category" defaultValue={book?.category ?? "Fiction"} className="field">
                  {CATEGORIES.map((category) => (
                    <option key={category.slug} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="label mb-2 block text-ink-muted">Language</span>
                <select name="language" defaultValue={book?.language ?? "English"} className="field">
                  {["English", "Yoruba", "Igbo", "Hausa", "French", "Pidgin", "Arabic"].map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="label mb-2 block text-ink-muted">Price (₦)</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="50"
                  required
                  defaultValue={book ? book.price_kobo / 100 : 2500}
                  className="field"
                />
                <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                  Enter 0 to publish a free edition.
                </span>
              </div>

              <Field
                label="Page count"
                name="pages"
                type="number"
                min="1"
                defaultValue={book?.pages ?? ""}
                hint="Optional, shown on the book page."
              />
            </div>

            <Field label="ISBN" name="isbn" defaultValue={book?.isbn ?? ""} hint="Optional." />
          </div>
        </section>

        <section className="border border-line bg-paper-card p-6">
          <h2 className="font-display text-[1.25rem] text-ink">The files</h2>
          <p className="mt-1 text-[0.8rem] text-ink-muted">
            The ebook is stored privately. Readers only receive a signed link after
            buying.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Cover */}
            <div>
              <span className="label mb-2 block text-ink-muted">Cover artwork</span>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging("cover");
                }}
                onDragLeave={() => setDragging(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(null);
                  chooseCover(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center transition-colors ${
                  dragging === "cover" ? "border-ember bg-ember/5" : "border-line hover:border-ink"
                }`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => chooseCover(event.target.files?.[0] ?? null)}
                />
                {coverPreview ? (
                  <span className="relative block aspect-[2/3] w-24 overflow-hidden">
                    <Image src={coverPreview} alt="" fill sizes="96px" className="object-cover" unoptimized />
                  </span>
                ) : (
                  <span className="font-display text-[1.6rem] leading-none text-ink-muted">＋</span>
                )}
                <span className="text-[0.78rem] font-medium text-ink">
                  {coverFile ? coverFile.name : coverPreview ? "Replace cover" : "Add cover"}
                </span>
                <span className="text-[0.68rem] text-ink-muted">JPG, PNG or WebP · 2:3 · max 8 MB</span>
              </label>
            </div>

            {/* Ebook */}
            <div>
              <span className="label mb-2 block text-ink-muted">Ebook file</span>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging("ebook");
                }}
                onDragLeave={() => setDragging(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(null);
                  chooseEbook(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex h-full min-h-[10.5rem] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center transition-colors ${
                  dragging === "ebook" ? "border-ember bg-ember/5" : "border-line hover:border-ink"
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf,application/epub+zip,.epub,.pdf"
                  className="sr-only"
                  onChange={(event) => chooseEbook(event.target.files?.[0] ?? null)}
                />
                <span className="font-display text-[1.6rem] leading-none text-ink-muted">
                  {format === "epub" ? "ePub" : format === "pdf" ? "PDF" : "＋"}
                </span>
                <span className="text-[0.78rem] font-medium text-ink">
                  {ebookFile
                    ? ebookFile.name
                    : book?.ebook_path
                      ? "Replace uploaded file"
                      : "Add PDF or ePub"}
                </span>
                <span className="text-[0.68rem] text-ink-muted">
                  {ebookFile
                    ? `${(ebookFile.size / 1024 / 1024).toFixed(1)} MB`
                    : "PDF or ePub · max 150 MB"}
                </span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Publish rail */}
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="border border-line bg-paper-card p-6">
          <p className="label text-ink-muted">Publishing</p>
          <h2 className="mt-2 font-display text-[1.4rem] leading-tight text-ink">
            {book?.status === "published" ? "This edition is live" : "Submit for review"}
          </h2>
          <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-muted">
            {book?.status === "published"
              ? "Edits go live immediately. The title stays published while you change the listing."
              : "An editor checks the cover, the description and the file. You are told either way, usually within a day."}
          </p>

          {state.error ? (
            <div className="mt-4">
              <ErrorNote>{state.error}</ErrorNote>
            </div>
          ) : null}

          {busy ? (
            <p className="mt-4 flex items-center gap-2 text-[0.78rem] text-ink-muted">
              <span className="h-3 w-3 animate-spin rounded-full border border-ink border-t-transparent" />
              {busy}
            </p>
          ) : null}

          <div className="mt-5 space-y-2">
            <button
              type="submit"
              data-intent="submit"
              disabled={working}
              className="btn btn-primary w-full"
            >
              {working ? "Working…" : book?.status === "published" ? "Save changes" : "Submit for review"}
            </button>
            {book?.status === "published" ? null : (
              <button
                type="submit"
                data-intent="draft"
                disabled={working}
                className="btn btn-quiet w-full"
              >
                Save as draft
              </button>
            )}
          </div>

          <p className="mt-4 text-[0.7rem] leading-relaxed text-ink-muted">
            By submitting you confirm you hold the rights to publish this work.
          </p>
        </div>

        <div className="border border-line bg-paper-deep p-5">
          <p className="label text-ink-muted">Royalty</p>
          <p className="mt-2 font-display text-[1.5rem] leading-none text-ink">You keep 90%</p>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-muted">
            Credited per sale. Request a payout from the earnings page once cleared.
          </p>
        </div>

        <Link
          href="/studio/books"
          className="block text-center text-[0.78rem] text-ink-muted hover:text-ink"
        >
          Cancel and return to your editions
        </Link>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  hint,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  hint?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block text-ink-muted">{label}</span>
      <input
        className="field"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={min}
      />
      {hint ? <span className="mt-1.5 block text-[0.72rem] text-ink-muted">{hint}</span> : null}
    </label>
  );
}
