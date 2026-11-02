"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { EBOOK_MAX_BYTES, COVER_MAX_BYTES, describeEbookFile } from "@/lib/ebooks";

export type ActionState = { ok: boolean; message: string } | null;

function failure(error: unknown): ActionState {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Something went wrong.";
  return { ok: false, message };
}

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

/** First sentence of the description, used as the card hook when none is typed. */
function hookFromDescription(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "";
  const sentence = flat.match(/^.{1,160}?[.!?](\s|$)/)?.[0] ?? flat;
  return sentence.trim().slice(0, 400);
}

/**
 * Self-service onboarding. A signed-in reader becomes a published-eligible
 * author immediately — no application, no waiting for an editor. Every book is
 * still reviewed by an administrator before it reaches the store.
 */
export async function startPublishingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to start publishing." };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const penName = text(formData, "pen_name");
  if (penName.length < 2) {
    return { ok: false, message: "Choose a pen name of at least two characters." };
  }

  const { error } = await supabase.rpc("start_self_publishing", {
    p_pen_name: penName,
    p_tagline: text(formData, "tagline") || null,
    p_bio: text(formData, "bio") || null,
    p_based_in: text(formData, "based_in") || null,
    p_country: text(formData, "country_code").toUpperCase().slice(0, 2) || null,
    p_writing_in: text(formData, "writing_in") || null,
  });
  if (error) return failure(error);

  revalidatePath("/author");
  revalidatePath("/author/books");
  revalidatePath("/authors");
  redirect("/author/books/new");
}

export async function applyAsAuthorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in to apply." };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const interests = formData.getAll("interests").map(String).filter(Boolean);
  const fullName = text(formData, "full_name");
  const penName = text(formData, "pen_name");
  const biography = text(formData, "biography");
  const country = text(formData, "country_code").toUpperCase().slice(0, 2);

  if (!fullName || !penName || biography.length < 80) {
    return {
      ok: false,
      message:
        "Full name, pen name and a biography of at least 80 characters are required.",
    };
  }
  if (country.length !== 2) return { ok: false, message: "Select a country." };

  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) {
      return { ok: false, message: "The photo must be 5 MB or smaller." };
    }
    const extension = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${viewer.id}/application-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("submission-files")
      .upload(path, photo, { upsert: true, contentType: photo.type || undefined });
    if (uploadError) return failure(uploadError);
    photoPath = path;
  }

  const { error } = await supabase.rpc("author_apply", {
    p_full_name: fullName,
    p_pen_name: penName,
    p_biography: biography,
    p_country: country,
    p_interests: interests,
    p_photo_path: photoPath,
    p_author_details: text(formData, "author_details") || null,
    p_writing_in: text(formData, "writing_in") || null,
  });
  if (error) return failure(error);

  revalidatePath("/author/apply");
  return {
    ok: true,
    message:
      "Application received. You will see the decision and the reviewer's note on this page — decisions are never made from the browser.",
  };
}

export async function saveAuthorProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };

  const patch: Record<string, string | null> = {
    pen_name: text(formData, "pen_name") || null,
    tagline: text(formData, "tagline") || null,
    bio: text(formData, "bio") || null,
    based_in: text(formData, "based_in") || null,
    writing_in: text(formData, "writing_in") || null,
    country_code: text(formData, "country_code").toUpperCase().slice(0, 2) || null,
  };

  const photo = formData.get("avatar");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 5 * 1024 * 1024) {
      return { ok: false, message: "The image must be 5 MB or smaller." };
    }
    const extension = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${viewer.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("author-avatars")
      .upload(path, photo, { upsert: true, contentType: photo.type || undefined });
    if (uploadError) return failure(uploadError);
    patch.avatar_path = path;
  }

  const { error } = await supabase
    .from("author_profiles")
    .update(patch)
    .eq("user_id", viewer.id);
  if (error) return failure(error);

  revalidatePath("/author/settings");
  return { ok: true, message: "Author profile saved." };
}

/* ------------------------------------------------------------------------- */
/* eBook upload                                                              */
/* ------------------------------------------------------------------------- */

/** Currencies an author may price in. Everything else is derived from NGN. */
const PRICE_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;

type UploadedFile = {
  bucket: "book-files" | "book-covers";
  path: string;
  mimeType: string;
  sizeBytes: number;
};

type ServerClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>;

async function storeFile(
  supabase: ServerClient,
  bucket: UploadedFile["bucket"],
  path: string,
  file: File,
): Promise<{ file?: UploadedFile; error?: ActionState }> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
  if (error) return { error: failure(error) };
  return {
    file: {
      bucket,
      path,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  };
}

/**
 * Writes the current eBook file for a book.
 *
 * One file, one format, and a version that always increases — the unique index
 * on (book_id, kind, format, version) and the one-current-per-kind index mean a
 * straight re-insert with version 1 would collide, which is why replacing a
 * file used to fail.
 */
async function attachEbookFile(
  supabase: ServerClient,
  bookId: string,
  uploaderId: string,
  file: File,
): Promise<ActionState> {
  const described = describeEbookFile(file);
  if (!described) {
    return { ok: false, message: "Attach a PDF or an EPUB file." };
  }
  if (file.size > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  const path = `${bookId}/${described.kind}-${Date.now()}.${described.extension}`;
  const stored = await storeFile(supabase, "book-files", path, file);
  if (!stored.file) return stored.error ?? null;

  const { data: previous } = await supabase
    .from("book_files")
    .select("id, version")
    .eq("book_id", bookId)
    .eq("kind", described.kind)
    .order("version", { ascending: false })
    .limit(1);

  const version = Number(previous?.[0]?.version ?? 0) + 1;

  await supabase
    .from("book_files")
    .update({ is_current: false })
    .eq("book_id", bookId)
    .eq("kind", described.kind);

  const { error } = await supabase.from("book_files").insert({
    book_id: bookId,
    kind: described.kind,
    // Digital only: a PDF and an EPUB are both editions of the ebook.
    format: "ebook",
    storage_bucket: "book-files",
    storage_path: path,
    mime_type: stored.file.mimeType,
    size_bytes: file.size,
    version,
    is_current: true,
    scan_status: "pending",
    uploaded_by: uploaderId,
  });
  if (error) return failure(error);
  return { ok: true, message: "eBook file attached." };
}

/**
 * Upload a new eBook.
 *
 * One screen: title, description, author name, cover, PDF or EPUB, price and
 * currency. Saving as a draft and submitting for approval are the same data —
 * the second just also asks an administrator to review it.
 */
export async function createEbookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const { data: author } = await supabase
    .from("author_profiles")
    .select("id, status, pen_name")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!author) return { ok: false, message: "Choose a pen name first — that is your author profile." };
  if (author.status === "suspended") {
    return { ok: false, message: "This publishing account is suspended." };
  }

  const title = text(formData, "title");
  if (title.length < 2) return { ok: false, message: "Enter a book title." };

  const descriptionRaw = text(formData, "description");
  const description = descriptionRaw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (description.length === 0) {
    return { ok: false, message: "Write a short description of the book." };
  }

  const priceMajor = Number(formData.get("price") ?? 0);
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    return { ok: false, message: "Set a selling price greater than zero." };
  }
  const requestedCurrency = (text(formData, "currency") || "NGN").toUpperCase();
  const currency = (PRICE_CURRENCIES as readonly string[]).includes(requestedCurrency)
    ? requestedCurrency
    : "NGN";

  const cover = formData.get("cover");
  if (!(cover instanceof File) || cover.size === 0) {
    return { ok: false, message: "Attach a cover image (JPG, PNG or WebP)." };
  }
  if (!cover.type.startsWith("image/")) {
    return { ok: false, message: "The cover must be an image file." };
  }
  if (cover.size > COVER_MAX_BYTES) {
    return { ok: false, message: "The cover image must be 10 MB or smaller." };
  }

  const ebook = formData.get("ebook");
  if (!(ebook instanceof File) || ebook.size === 0) {
    return { ok: false, message: "Attach the eBook file — a PDF or an EPUB." };
  }
  const described = describeEbookFile(ebook);
  if (!described) return { ok: false, message: "The eBook must be a PDF or an EPUB file." };
  if (ebook.size > EBOOK_MAX_BYTES) {
    return { ok: false, message: "The eBook file must be 200 MB or smaller." };
  }

  const categoryId = text(formData, "category_id");
  if (!categoryId) return { ok: false, message: "Choose a category." };

  // Resolve the non-NGN price before anything is written: an unsupported
  // currency must not leave a half-created draft behind.
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

  const authorName = text(formData, "author_name");
  if (authorName.length >= 2 && authorName !== author.pen_name) {
    const { error: nameError } = await supabase
      .from("author_profiles")
      .update({ pen_name: authorName.slice(0, 120) })
      .eq("id", author.id);
    if (nameError) return failure(nameError);
  }

  const hook =
    text(formData, "hook") || hookFromDescription(descriptionRaw) || title.slice(0, 160);

  const baseSlug = slugify(title) || "untitled";
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      author_id: author.id,
      primary_category_id: categoryId,
      slug,
      title,
      hook,
      description_paragraphs: description,
      language: "English",
      status: "draft",
      rights_declared_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (bookError || !book) return failure(bookError);

  // Cover first: the public catalogue needs it, and submission refuses without.
  const coverExtension = cover.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const coverStored = await storeFile(
    supabase,
    "book-covers",
    `${book.id}/cover.${coverExtension}`,
    cover,
  );
  if (!coverStored.file) return coverStored.error ?? null;
  await supabase
    .from("books")
    .update({ cover_path: coverStored.file.path })
    .eq("id", book.id);

  // One eBook format, priced once.
  const { data: format, error: formatError } = await supabase
    .from("book_formats")
    .insert({ book_id: book.id, format: "ebook", is_available: true })
    .select("id")
    .single();
  if (formatError || !format) return failure(formatError);

  // NGN is always the base price the catalogue and the submit checks depend on.
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
  if (priceError) return failure(priceError);

  const attached = await attachEbookFile(supabase, book.id, viewer.id, ebook);
  if (attached && !attached.ok) {
    return {
      ok: false,
      message: `${attached.message} The book is saved as a draft — open it to attach the file again.`,
    };
  }

  const submit = text(formData, "intent") === "submit";
  if (submit) {
    const { error: submitError } = await supabase.rpc("book_submit", {
      p_book_id: book.id,
    });
    if (submitError) {
      return {
        ok: false,
        message: `${submitError.message} The book is saved as a draft — open it, fix that, then submit.`,
      };
    }
  }

  revalidatePath("/author");
  revalidatePath("/author/books");
  redirect(submit ? "/author/books?status=submitted" : `/author/books/${book.id}`);
}

/**
 * Replaces the eBook file on an existing book — for a first attachment that
 * failed, a correction an administrator asked for, or a new edition. Only the
 * file changes; the price, cover and details stay as they are.
 */
export async function replaceEbookFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const bookId = text(formData, "book_id");
  const file = formData.get("ebook");
  if (!bookId) return { ok: false, message: "Which book?" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a PDF or EPUB file." };
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, status")
    .eq("id", bookId)
    .maybeSingle();
  if (!book) return { ok: false, message: "Book not found." };
  if (["submitted", "published", "approved"].includes(String(book.status))) {
    return {
      ok: false,
      message:
        "This book is with an editor or already on sale. Ask for a change from the book page first.",
    };
  }

  const result = await attachEbookFile(supabase, bookId, viewer.id, file);
  if (result && !result.ok) return result;

  revalidatePath(`/author/books/${bookId}`);
  return { ok: true, message: "eBook file replaced." };
}

/**
 * Edits a book that has not yet been approved. Covers the corrections an author
 * needs before a first submission and the fixes an editor asks for when a book
 * comes back as changes requested — without this, a returned book could never
 * be put right.
 */
export async function updateBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const bookId = text(formData, "book_id");
  if (!bookId) return { ok: false, message: "Which book?" };

  const { data: book } = await supabase
    .from("books")
    .select("id, status")
    .eq("id", bookId)
    .maybeSingle();

  if (!book) return { ok: false, message: "Book not found." };
  if (!["draft", "changes_requested"].includes(String(book.status))) {
    return {
      ok: false,
      message: "A book can only be edited while it is a draft or back with you for changes.",
    };
  }

  const title = text(formData, "title");
  if (title.length < 2) return { ok: false, message: "A title is required." };

  const descriptionRaw = text(formData, "description");
  const description = descriptionRaw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (description.length === 0) {
    return { ok: false, message: "At least one description paragraph is required." };
  }

  const priceMajor = Number(formData.get("price") ?? 0);
  if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
    return { ok: false, message: "Set a selling price greater than zero." };
  }

  const { error: bookError } = await supabase
    .from("books")
    .update({
      primary_category_id: text(formData, "category_id") || null,
      title,
      hook: text(formData, "hook") || hookFromDescription(descriptionRaw) || title.slice(0, 160),
      description_paragraphs: description,
      rights_declared_at: new Date().toISOString(),
    })
    .eq("id", bookId);
  if (bookError) return failure(bookError);

  // One ebook format, one NGN price.
  const { data: existingFormat } = await supabase
    .from("book_formats")
    .select("id")
    .eq("book_id", bookId)
    .eq("format", "ebook")
    .maybeSingle();

  let formatId = existingFormat?.id as string | undefined;
  if (formatId) {
    await supabase.from("book_formats").update({ is_available: true }).eq("id", formatId);
  } else {
    const { data: created, error } = await supabase
      .from("book_formats")
      .insert({ book_id: bookId, format: "ebook", is_available: true })
      .select("id")
      .single();
    if (error) return failure(error);
    formatId = created.id;
  }

  const { error: priceError } = await supabase.from("book_prices").upsert(
    {
      book_format_id: formatId,
      currency: "NGN",
      price_minor: Math.round(priceMajor * 100),
      is_active: true,
    },
    { onConflict: "book_format_id,currency" },
  );
  if (priceError) return failure(priceError);

  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    if (cover.size > COVER_MAX_BYTES) {
      return { ok: false, message: "Cover images must be 10 MB or smaller." };
    }
    const extension = cover.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${bookId}/cover.${extension}`;
    const { error: coverError } = await supabase.storage
      .from("book-covers")
      .upload(path, cover, { upsert: true, contentType: cover.type || undefined });
    if (coverError) return failure(coverError);

    const { error: pathError } = await supabase
      .from("books")
      .update({ cover_path: path })
      .eq("id", bookId);
    if (pathError) return failure(pathError);
  }

  const ebook = formData.get("ebook");
  if (ebook instanceof File && ebook.size > 0) {
    const result = await attachEbookFile(supabase, bookId, viewer.id, ebook);
    if (result && !result.ok) return result;
  }

  revalidatePath(`/author/books/${bookId}`);
  revalidatePath("/author/books");
  return { ok: true, message: "Saved." };
}

export async function submitBookAction(bookId: string): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const { error } = await supabase.rpc("book_submit", { p_book_id: bookId });
  if (error) return failure(error);

  revalidatePath("/author");
  revalidatePath("/author/books");
  revalidatePath(`/author/books/${bookId}`);
  return { ok: true, message: "Submitted for review." };
}

export async function savePayoutAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const { data: author } = await supabase
    .from("author_profiles")
    .select("id")
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (!author) return { ok: false, message: "No author profile found." };

  const bankName = text(formData, "bank_name");
  const accountName = text(formData, "account_name");
  const accountNumber = text(formData, "account_number");
  if (!bankName || !accountName || accountNumber.length < 6) {
    return { ok: false, message: "Bank name, account name and account number are required." };
  }

  await supabase
    .from("payout_accounts")
    .update({ is_default: false })
    .eq("author_id", author.id);

  const { error } = await supabase.from("payout_accounts").insert({
    author_id: author.id,
    provider: "manual_bank",
    bank_name: bankName,
    account_name: accountName,
    account_last4: accountNumber.slice(-4),
    currency: "NGN",
    is_default: true,
  });
  if (error) return failure(error);
  revalidatePath("/author/earnings");
  return { ok: true, message: "Payout account saved." };
}

export async function requestWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const amount = Number(formData.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter an amount." };
  }

  const { error } = await supabase.rpc("request_withdrawal", {
    p_amount_minor: Math.round(amount * 100),
    p_payout_account_id: text(formData, "payout_account_id"),
  });
  if (error) return failure(error);

  revalidatePath("/author/earnings");
  return { ok: true, message: "Withdrawal requested. Payouts are reviewed and paid manually." };
}
