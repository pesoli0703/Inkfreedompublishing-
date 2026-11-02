"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth";
import {
  COVER_MAX_BYTES,
  EBOOK_MAX_BYTES,
  describeEbookFile,
  type DescribedEbook,
} from "@/lib/ebooks";
import type {
  FinalizeEbookInput,
  FinalizeEbookResult,
  FinalizeReplacementInput,
  FinalizeReplacementResult,
  PrepareCoverInput,
  PrepareCoverResult,
  FinalizeCoverInput,
  FinalizeCoverResult,
  PrepareEbookInput,
  PrepareEbookResult,
  PrepareReplacementInput,
  PrepareReplacementResult,
  StorageBucket,
  UploadTicket,
} from "@/lib/ebook-upload";

/* ------------------------------------------------------------------------- */
/* Shared server helpers                                                     */
/* ------------------------------------------------------------------------- */

type ServerClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>;

const COVER_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const extensionOf = (name: string) =>
  name.toLowerCase().includes(".") ? name.split(".").pop() ?? "" : "";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const hookFromDescription = (description: string) => {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "";
  const sentence = flat.match(/^.{1,160}?[.!?](\s|$)/)?.[0] ?? flat;
  return sentence.trim().slice(0, 200);
};

const errorMessage = (error: unknown, fallback: string) =>
  error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : fallback;

const PRICE_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

type AuthorAccess =
  | { ok: true; viewer: { id: string }; author: { id: string; pen_name: string | null } }
  | { ok: false; message: string };

async function requireAuthor(supabase: ServerClient): Promise<AuthorAccess> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const { data: author } = await supabase
    .from("author_profiles")
    .select("id, pen_name, status")
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (!author) {
    return { ok: false, message: "Choose a pen name first — that is your author profile." };
  }
  if (author.status === "suspended") {
    return { ok: false, message: "This publishing account is suspended." };
  }
  return { ok: true, viewer, author };
}

/**
 * A signed, single-path write permission.
 *
 * Created with the service role so it cannot be blocked or widened by the
 * client, and it can only ever write the one path the server chose.
 */
async function ticketFor(
  bucket: StorageBucket,
  path: string,
  upsert: boolean,
): Promise<{ ticket?: UploadTicket; error?: string }> {
  if (!serviceRoleConfigured()) {
    return { error: "File storage is not connected on this deployment." };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert });
  if (error || !data?.token) {
    return { error: errorMessage(error, "Could not prepare the upload.") ?? "Could not prepare the upload." };
  }
  return { ticket: { bucket, path: data.path ?? path, token: data.token } };
}

/**
 * Read back what was actually stored.
 *
 * The client is never trusted about what it uploaded: the size and content type
 * are taken from Storage itself, and the path has to sit inside the book's own
 * folder.
 */
async function inspectStored(
  bookId: string,
  bucket: StorageBucket,
  path: string,
): Promise<{ size?: number; mimeType?: string; error?: string }> {
  if (!path.startsWith(`${bookId}/`)) {
    return { error: "That file does not belong to this book." };
  }
  if (!serviceRoleConfigured()) {
    return { error: "File storage is not connected on this deployment." };
  }
  const admin = createAdminClient();
  const folder = path.slice(0, path.lastIndexOf("/")) || bookId;
  const name = path.slice(path.lastIndexOf("/") + 1);

  const { data, error } = await admin.storage.from(bucket).list(folder, {
    search: name,
    limit: 100,
  });
  if (error) return { error: errorMessage(error, "Could not read the uploaded file.") };

  const object = data?.find((entry) => entry.name === name);
  if (!object) return { error: "The upload did not arrive. Please try again." };

  const metadata = (object.metadata ?? {}) as { size?: number; mimetype?: string };
  return { size: Number(metadata.size ?? 0), mimeType: metadata.mimetype };
}

/* ------------------------------------------------------------------------- */
/* New eBook                                                                 */
/* ------------------------------------------------------------------------- */

export async function prepareEbookUploadAction(
  input: PrepareEbookInput,
): Promise<PrepareEbookResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { viewer, author } = access;

  const title = (input.title ?? "").trim();
  if (title.length < 2) return { ok: false, message: "Enter a book title." };

  const descriptionRaw = (input.description ?? "").trim();
  const description = descriptionRaw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (description.length === 0) {
    return { ok: false, message: "Write a short description of the book." };
  }

  const categoryId = (input.categoryId ?? "").trim();
  if (!categoryId) return { ok: false, message: "Choose a category." };

  const priceMajor = Number(input.price ?? 0);
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    return { ok: false, message: "Set a selling price greater than zero." };
  }

  const requestedCurrency = (input.currency ?? "NGN").toUpperCase();
  const currency = PRICE_CURRENCIES.includes(requestedCurrency) ? requestedCurrency : "NGN";

  // Cover
  const coverName = (input.cover?.name ?? "").trim();
  const coverExtension = extensionOf(coverName);
  if (!COVER_TYPES[coverExtension]) {
    return { ok: false, message: "The cover must be a JPG, PNG or WebP image." };
  }
  const coverSize = Number(input.cover?.size ?? 0);
  if (coverSize <= 0) return { ok: false, message: "Attach a cover image." };
  if (coverSize > COVER_MAX_BYTES) {
    return { ok: false, message: "The cover image must be 10 MB or smaller." };
  }

  // eBook
  const ebookName = (input.ebook?.name ?? "").trim();
  const described = describeEbookFile({ name: ebookName });
  if (!described) {
    return { ok: false, message: "The eBook must be a PDF or an EPUB file." };
  }
  const ebookSize = Number(input.ebook?.size ?? 0);
  if (ebookSize <= 0) return { ok: false, message: "Attach the eBook file." };
  if (ebookSize > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  // A non-NGN price needs a stored rate before anything is created.
  const ngnMinor = Math.round(priceMajor * 100);
  let convertedMinor: number | null = null;
  if (currency !== "NGN") {
    const { data: rate } = await supabase
      .from("fx_rates")
      .select("rate")
      .eq("base_currency", "NGN")
      .eq("quote_currency", currency)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!rate?.rate) {
      return {
        ok: false,
        message: `No ${currency} exchange rate is configured yet, so this price cannot be set in ${currency}. Price in NGN — the bookstore converts it once rates are loaded.`,
      };
    }
    convertedMinor = Math.round(ngnMinor * Number(rate.rate));
  }

  // The author name on the cover page is their pen name.
  const authorName = (input.authorName ?? "").trim();
  if (authorName.length >= 2 && authorName !== author.pen_name) {
    const { error: nameError } = await supabase
      .from("author_profiles")
      .update({ pen_name: authorName.slice(0, 120) })
      .eq("id", author.id);
    if (nameError) return { ok: false, message: errorMessage(nameError, "Could not save the author name.") };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      author_id: author.id,
      primary_category_id: categoryId,
      slug: `${slugify(title) || "untitled"}-${Date.now().toString(36).slice(-4)}`,
      title,
      hook: hookFromDescription(descriptionRaw) || title.slice(0, 160),
      description_paragraphs: description,
      language: "English",
      status: "draft",
      rights_declared_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (bookError || !book) {
    return { ok: false, message: errorMessage(bookError, "Could not create the book.") };
  }

  // One eBook format, priced once. NGN is always the base price.
  const { data: format, error: formatError } = await supabase
    .from("book_formats")
    .insert({ book_id: book.id, format: "ebook", is_available: true })
    .select("id")
    .single();
  if (formatError || !format) {
    return { ok: false, message: errorMessage(formatError, "Could not set up the eBook format.") };
  }

  const priceRows = [
    { book_format_id: format.id, currency: "NGN", price_minor: ngnMinor, is_active: true },
  ];
  if (convertedMinor !== null) {
    priceRows.push({
      book_format_id: format.id,
      currency,
      price_minor: convertedMinor,
      is_active: true,
    });
  }
  const { error: priceError } = await supabase.from("book_prices").insert(priceRows);
  if (priceError) {
    return { ok: false, message: errorMessage(priceError, "Could not save the price.") };
  }

  const cover = await ticketFor("book-covers", `${book.id}/cover.${coverExtension}`, true);
  if (!cover.ticket) return { ok: false, message: cover.error ?? "Could not prepare the upload." };

  const ebook = await ticketFor(
    "book-files",
    `${book.id}/${described.kind}-${Date.now()}.${described.extension}`,
    false,
  );
  if (!ebook.ticket) return { ok: false, message: ebook.error ?? "Could not prepare the upload." };

  return {
    ok: true,
    bookId: book.id,
    cover: cover.ticket,
    ebook: { ...ebook.ticket, kind: described.kind, extension: described.extension },
  };
}

export async function finalizeEbookUploadAction(
  input: FinalizeEbookInput,
): Promise<FinalizeEbookResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { viewer, author } = access;

  const bookId = input.bookId;
  const { data: book } = await supabase
    .from("books")
    .select("id, status, author_id")
    .eq("id", bookId)
    .maybeSingle();
  if (!book || book.author_id !== author.id) {
    return { ok: false, message: "Book not found." };
  }
  if (book.status !== "draft") {
    return { ok: false, message: "This book can no longer accept an upload." };
  }

  // Cover: confirm it exists in the public bucket before pointing the book at it.
  const cover = await inspectStored(bookId, "book-covers", input.coverPath);
  if (!cover.size) return { ok: false, message: cover.error ?? "The cover did not upload." };
  if (cover.size > COVER_MAX_BYTES) {
    return { ok: false, message: "The cover image must be 10 MB or smaller." };
  }

  // eBook file: same check, and the size limit is enforced on the stored bytes.
  const stored = await inspectStored(bookId, "book-files", input.ebookPath);
  if (!stored.size) return { ok: false, message: stored.error ?? "The eBook file did not upload." };
  if (stored.size > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  const described = describeEbookFile({ name: input.ebookName || input.ebookPath });
  if (!described) return { ok: false, message: "The eBook must be a PDF or an EPUB file." };

  const { error: coverError } = await supabase
    .from("books")
    .update({ cover_path: input.coverPath })
    .eq("id", bookId);
  if (coverError) {
    return { ok: false, message: errorMessage(coverError, "Could not save the cover.") };
  }

  const recorded = await recordEbookFile(supabase, {
    bookId,
    uploaderId: viewer.id,
    kind: described.kind,
    path: input.ebookPath,
    mimeType:
      stored.mimeType ??
      (described.extension === "pdf" ? "application/pdf" : "application/epub+zip"),
    sizeBytes: stored.size,
  });
  if (recorded) return { ok: false, message: recorded };

  let submitted = false;
  if (input.intent === "submit") {
    const { error } = await supabase.rpc("book_submit", { p_book_id: bookId });
    if (error) {
      return {
        ok: false,
        message: `${error.message} Your book is saved as a draft — open it, fix that, then submit.`,
      };
    }
    submitted = true;
  }

  revalidatePath("/author");
  revalidatePath("/author/books");
  return {
    ok: true,
    message: submitted
      ? "Submitted for approval. An administrator will read it next."
      : "Saved as a draft.",
    redirectTo: submitted ? "/author/books?status=submitted" : `/author/books/${bookId}`,
  };
}

/* ------------------------------------------------------------------------- */
/* Replacing the file on an existing book                                    */
/* ------------------------------------------------------------------------- */

export async function prepareReplacementUploadAction(
  input: PrepareReplacementInput,
): Promise<PrepareReplacementResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { author } = access;

  const described = describeEbookFile({ name: input.file?.name ?? "" });
  if (!described) return { ok: false, message: "Choose a PDF or EPUB file." };
  const size = Number(input.file?.size ?? 0);
  if (size <= 0) return { ok: false, message: "Choose a PDF or EPUB file." };
  if (size > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, status, author_id")
    .eq("id", input.bookId)
    .maybeSingle();
  if (!book || book.author_id !== author.id) {
    return { ok: false, message: "Book not found." };
  }
  if (["submitted", "approved", "published"].includes(String(book.status))) {
    return {
      ok: false,
      message:
        "This book is with an editor or already on sale. Its file cannot be swapped while it is listed.",
    };
  }

  const ticket = await ticketFor(
    "book-files",
    `${book.id}/${described.kind}-${Date.now()}.${described.extension}`,
    false,
  );
  if (!ticket.ticket) return { ok: false, message: ticket.error ?? "Could not prepare the upload." };

  return {
    ok: true,
    ticket: ticket.ticket,
    kind: described.kind,
    extension: described.extension,
  };
}

export async function finalizeReplacementUploadAction(
  input: FinalizeReplacementInput,
): Promise<FinalizeReplacementResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { viewer, author } = access;

  const { data: book } = await supabase
    .from("books")
    .select("id, status, author_id")
    .eq("id", input.bookId)
    .maybeSingle();
  if (!book || book.author_id !== author.id) {
    return { ok: false, message: "Book not found." };
  }

  const stored = await inspectStored(input.bookId, "book-files", input.path);
  if (!stored.size) return { ok: false, message: stored.error ?? "The file did not upload." };
  if (stored.size > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  const described = describeEbookFile({ name: input.fileName });
  if (!described) return { ok: false, message: "The eBook must be a PDF or an EPUB file." };

  const recorded = await recordEbookFile(supabase, {
    bookId: input.bookId,
    uploaderId: viewer.id,
    kind: described.kind,
    path: input.path,
    mimeType:
      stored.mimeType ??
      (described.extension === "pdf" ? "application/pdf" : "application/epub+zip"),
    sizeBytes: stored.size,
  });
  if (recorded) return { ok: false, message: recorded };

  revalidatePath(`/author/books/${input.bookId}`);
  revalidatePath("/author/books");
  return { ok: true, message: `${described.label} attached as the current file.` };
}

/* ------------------------------------------------------------------------- */
/* book_files row                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Writes the current eBook file for a book.
 *
 * One file, one format, and a version that always increases: the unique index on
 * (book_id, kind, format, version) and the one-current-per-kind index mean a
 * straight re-insert with version 1 would collide, which is why replacing a file
 * used to fail.
 */
async function recordEbookFile(
  supabase: ServerClient,
  file: {
    bookId: string;
    uploaderId: string;
    kind: DescribedEbook["kind"];
    path: string;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<string | null> {
  const { data: previous } = await supabase
    .from("book_files")
    .select("version")
    .eq("book_id", file.bookId)
    .eq("kind", file.kind)
    .order("version", { ascending: false })
    .limit(1);

  const version = Number(previous?.[0]?.version ?? 0) + 1;

  await supabase
    .from("book_files")
    .update({ is_current: false })
    .eq("book_id", file.bookId)
    .eq("kind", file.kind);

  const { error } = await supabase.from("book_files").insert({
    book_id: file.bookId,
    kind: file.kind,
    // Digital only: a PDF and an EPUB are both editions of the ebook.
    format: "ebook",
    storage_bucket: "book-files",
    storage_path: file.path,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    version,
    is_current: true,
    scan_status: "pending",
    uploaded_by: file.uploaderId,
  });

  return error ? errorMessage(error, "Could not record the file.") : null;
}

/* ------------------------------------------------------------------------- */
/* Replacing the cover                                                       */
/* ------------------------------------------------------------------------- */

export async function prepareCoverUploadAction(
  input: PrepareCoverInput,
): Promise<PrepareCoverResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { author } = access;

  const extension = extensionOf(input.cover?.name ?? "");
  if (!COVER_TYPES[extension]) {
    return { ok: false, message: "The cover must be a JPG, PNG or WebP image." };
  }
  const size = Number(input.cover?.size ?? 0);
  if (size <= 0) return { ok: false, message: "Attach a cover image." };
  if (size > COVER_MAX_BYTES) {
    return { ok: false, message: "The cover image must be 10 MB or smaller." };
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, author_id")
    .eq("id", input.bookId)
    .maybeSingle();
  if (!book || book.author_id !== author.id) {
    return { ok: false, message: "Book not found." };
  }

  // A fresh name each time, so a replaced cover is never served from a cache.
  const ticket = await ticketFor(
    "book-covers",
    `${input.bookId}/cover-${Date.now()}.${extension}`,
    false,
  );
  if (!ticket.ticket) {
    return { ok: false, message: ticket.error ?? "Could not prepare the upload." };
  }
  return { ok: true, ticket: ticket.ticket };
}

export async function finalizeCoverUploadAction(
  input: FinalizeCoverInput,
): Promise<FinalizeCoverResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const access = await requireAuthor(supabase);
  if (!access.ok) return { ok: false, message: access.message };
  const { author } = access;

  const { data: book } = await supabase
    .from("books")
    .select("id, author_id")
    .eq("id", input.bookId)
    .maybeSingle();
  if (!book || book.author_id !== author.id) {
    return { ok: false, message: "Book not found." };
  }

  const cover = await inspectStored(input.bookId, "book-covers", input.path);
  if (!cover.size) return { ok: false, message: cover.error ?? "The cover did not upload." };
  if (cover.size > COVER_MAX_BYTES) {
    return { ok: false, message: "The cover image must be 10 MB or smaller." };
  }

  const { error } = await supabase
    .from("books")
    .update({ cover_path: input.path })
    .eq("id", input.bookId);
  if (error) return { ok: false, message: errorMessage(error, "Could not save the cover.") };

  revalidatePath(`/author/books/${input.bookId}`);
  revalidatePath("/author/books");
  return { ok: true, message: "Cover replaced." };
}
