"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";

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

type FormatInput = { format: "paperback" | "hardcover" | "ebook"; priceMajor: number };

function readFormats(formData: FormData): FormatInput[] {
  const formats: FormatInput[] = [];
  for (const format of ["paperback", "hardcover", "ebook"] as const) {
    if (formData.get(`format_${format}`) === "on") {
      const price = Number(formData.get(`price_${format}`) ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;
      formats.push({ format, priceMajor: price });
    }
  }
  return formats;
}

export async function createBookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const { data: author } = await supabase
    .from("author_profiles")
    .select("id, status")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!author || author.status !== "approved") {
    return { ok: false, message: "Only approved authors can create books." };
  }

  const title = text(formData, "title");
  if (title.length < 2) return { ok: false, message: "A title is required." };

  const formats = readFormats(formData);
  if (formats.length === 0) {
    return { ok: false, message: "Add at least one format with an NGN price." };
  }

  const description = text(formData, "description")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const baseSlug = slugify(text(formData, "slug") || title) || "untitled";
  const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      author_id: author.id,
      primary_category_id: text(formData, "category_id") || null,
      slug,
      title,
      subtitle: text(formData, "subtitle") || null,
      hook: text(formData, "hook") || null,
      description_paragraphs: description,
      excerpt_label: text(formData, "excerpt_label") || null,
      excerpt_body: text(formData, "excerpt_body") || null,
      themes: text(formData, "themes")
        .split(",")
        .map((theme) => theme.trim())
        .filter(Boolean),
      language: text(formData, "language") || "English",
      page_count: Number(formData.get("page_count")) || null,
      status: "draft",
      rights_declared_at: formData.get("rights") === "on" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (bookError) return failure(bookError);

  const { error: formatsError } = await supabase.from("book_formats").insert(
    formats.map(({ format }) => ({ book_id: book.id, format, is_available: true })),
  );
  if (formatsError) return failure(formatsError);

  const { data: createdFormats, error: readError } = await supabase
    .from("book_formats")
    .select("id, format")
    .eq("book_id", book.id);
  if (readError) return failure(readError);

  const { error: priceError } = await supabase.from("book_prices").insert(
    (createdFormats ?? []).map((row) => {
      const match = formats.find((entry) => entry.format === row.format);
      return {
        book_format_id: row.id,
        currency: "NGN",
        price_minor: Math.round((match?.priceMajor ?? 0) * 100),
        is_active: true,
      };
    }),
  );
  if (priceError) return failure(priceError);

  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const extension = cover.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${book.id}/cover.${extension}`;
    const { error: coverError } = await supabase.storage
      .from("book-covers")
      .upload(path, cover, { upsert: true, contentType: cover.type || undefined });
    if (!coverError) {
      await supabase.from("books").update({ cover_path: path }).eq("id", book.id);
    }
  }

  redirect(`/author/books/${book.id}`);
}

export async function submitBookAction(bookId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.rpc("book_submit", { p_book_id: bookId });
  revalidatePath("/author/books");
  revalidatePath(`/author/books/${bookId}`);
}

export async function uploadBookFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Please sign in again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, message: "Accounts are not connected." };

  const bookId = text(formData, "book_id");
  const kind = text(formData, "kind");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a file to upload." };
  }
  if (!["ebook", "pdf", "sample", "interior"].includes(kind)) {
    return { ok: false, message: "Unknown file kind." };
  }
  if (file.size > 200 * 1024 * 1024) {
    return { ok: false, message: "Files must be 200 MB or smaller." };
  }

  const bucket = kind === "sample" ? "book-samples" : "book-files";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${bookId}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || undefined });
  if (uploadError) return failure(uploadError);

  await supabase
    .from("book_files")
    .update({ is_current: false })
    .eq("book_id", bookId)
    .eq("kind", kind);

  const { error } = await supabase.from("book_files").insert({
    book_id: bookId,
    kind,
    storage_bucket: bucket,
    storage_path: path,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    is_current: true,
    version: 1,
    scan_status: "pending",
    uploaded_by: viewer.id,
  });
  if (error) return failure(error);

  revalidatePath(`/author/books/${bookId}`);
  return { ok: true, message: "File uploaded. It is private and served only through signed links." };
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
