"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuthor } from "@/lib/auth";
import { CATEGORY_NAMES } from "@/lib/categories";
import { slugify } from "@/lib/format";

export type BookFormState = { error: string | null; message?: string | null };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function uniqueSlug(title: string, ignoreId?: string) {
  const supabase = await createSupabaseServerClient();
  const base = slugify(title) || "untitled";
  let candidate = base;
  let counter = 1;

  for (;;) {
    const { data } = await supabase
      .from("ink_books")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data || data.id === ignoreId) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export async function saveBookAction(
  _prev: BookFormState,
  formData: FormData,
): Promise<BookFormState> {
  const viewer = await requireAuthor();
  const bookId = text(formData, "bookId");
  const intent = text(formData, "intent") === "submit" ? "submit" : "draft";

  const title = text(formData, "title");
  const description = text(formData, "description");
  const category = text(formData, "category");
  const language = text(formData, "language") || "English";
  const priceNaira = Number(text(formData, "price") || "0");
  const pagesRaw = text(formData, "pages");
  const coverPath = text(formData, "coverPath");
  const ebookPath = text(formData, "ebookPath");
  const ebookFormat = text(formData, "ebookFormat");
  const ebookSize = Number(text(formData, "ebookSize") || "0");

  if (title.length < 2) return { error: "Give the edition a title." };
  if (description.length < 40) {
    return { error: "Write at least a couple of sentences for the description." };
  }
  if (!CATEGORY_NAMES.includes(category)) return { error: "Choose a category." };
  if (!Number.isFinite(priceNaira) || priceNaira < 0) return { error: "Enter a valid price." };
  if (!ebookPath) return { error: "Attach the ebook file (PDF or ePub)." };
  if (ebookFormat !== "pdf" && ebookFormat !== "epub") {
    return { error: "The ebook must be a PDF or an ePub." };
  }

  const supabase = await createSupabaseServerClient();
  const slug = await uniqueSlug(title, bookId || undefined);

  const payload = {
    title,
    slug,
    subtitle: text(formData, "subtitle") || null,
    description,
    category,
    language,
    price_kobo: Math.round(priceNaira * 100),
    pages: pagesRaw ? Number(pagesRaw) : null,
    isbn: text(formData, "isbn") || null,
    cover_path: coverPath || null,
    ebook_path: ebookPath,
    ebook_format: ebookFormat,
    ebook_size_bytes: ebookSize || null,
    status: intent === "submit" ? ("pending" as const) : ("draft" as const),
    submitted_at: intent === "submit" ? new Date().toISOString() : null,
  };

  if (bookId) {
    const { data: existing } = await supabase
      .from("ink_books")
      .select("id, status, author_id")
      .eq("id", bookId)
      .maybeSingle();

    if (!existing || existing.author_id !== viewer.author.id) {
      return { error: "That edition is not yours to edit." };
    }

    // A published title stays published; editing it does not push it back into
    // the queue unless the author explicitly resubmits a rejected listing.
    const nextStatus =
      existing.status === "published"
        ? "published"
        : intent === "submit"
          ? "pending"
          : existing.status === "rejected"
            ? "draft"
            : existing.status;

    const { error } = await supabase
      .from("ink_books")
      .update({ ...payload, status: nextStatus })
      .eq("id", bookId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("ink_books").insert({
      ...payload,
      author_id: viewer.author.id,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/studio");
  revalidatePath("/studio/books");
  revalidatePath("/books");
  redirect(intent === "submit" ? "/studio/books?submitted=1" : "/studio/books?saved=1");
}

export async function submitForReviewAction(formData: FormData) {
  const viewer = await requireAuthor();
  const bookId = String(formData.get("bookId") ?? "");
  const supabase = await createSupabaseServerClient();

  const { data: book } = await supabase
    .from("ink_books")
    .select("id, author_id, ebook_path, status")
    .eq("id", bookId)
    .maybeSingle();

  if (!book || book.author_id !== viewer.author.id) redirect("/studio/books");
  if (!book.ebook_path) redirect("/studio/books?error=missing-file");

  await supabase
    .from("ink_books")
    .update({ status: "pending", submitted_at: new Date().toISOString(), review_note: null })
    .eq("id", bookId);

  revalidatePath("/studio/books");
  redirect("/studio/books?submitted=1");
}

export async function deleteBookAction(formData: FormData) {
  const viewer = await requireAuthor();
  const bookId = String(formData.get("bookId") ?? "");
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("ink_books")
    .delete()
    .eq("id", bookId)
    .eq("author_id", viewer.author.id);

  revalidatePath("/studio/books");
  redirect("/studio/books?deleted=1");
}

export async function requestPayoutAction(formData: FormData) {
  const viewer = await requireAuthor();
  const amountNaira = Number(String(formData.get("amount") ?? "0"));
  const supabase = await createSupabaseServerClient();

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    redirect("/studio/earnings?error=amount");
  }

  const { data: balance } = await supabase
    .from("ink_author_balances")
    .select("available_kobo")
    .eq("author_id", viewer.author.id)
    .maybeSingle();

  const available = Number(balance?.available_kobo ?? 0);
  const requested = Math.round(amountNaira * 100);

  if (requested > available) {
    redirect("/studio/earnings?error=insufficient");
  }

  const { error } = await supabase.from("ink_payouts").insert({
    author_id: viewer.author.id,
    amount_kobo: requested,
    status: "requested",
    note: "Requested from the author studio",
  });

  if (error) redirect(`/studio/earnings?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/studio/earnings");
  revalidatePath("/admin/payouts");
  redirect("/studio/earnings?requested=1");
}
