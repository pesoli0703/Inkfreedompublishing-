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
