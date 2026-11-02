import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { Author, Book, BookWithAuthor } from "./types";

/**
 * Network and permission failures degrade to an empty shelf instead of a 500.
 * The reason is logged for the server, never shown as a stack trace to a reader.
 */
function failed<T>(label: string, error: { message: string }, fallback: T): T {
  console.error(`[inkfreedom] ${label}: ${error.message}`);
  return fallback;
}

const BOOK_SELECT = `
  id, author_id, title, slug, subtitle, description, category, language,
  price_kobo, cover_path, ebook_path, ebook_format, ebook_size_bytes, pages,
  isbn, status, review_note, submitted_at, published_at, created_at, updated_at,
  author:ink_authors!ink_books_author_id_fkey ( id, slug, name, tagline )
`;

export type CatalogueQuery = {
  q?: string;
  category?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "title";
  limit?: number;
};

export async function listBooks(filters: CatalogueQuery = {}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("ink_books")
    .select(BOOK_SELECT)
    .eq("status", "published");

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, " ").trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,subtitle.ilike.%${term}%,description.ilike.%${term}%`);
    }
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price_kobo", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price_kobo", { ascending: false });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    default:
      query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) return failed("listBooks", error, []);
  return (data ?? []) as unknown as BookWithAuthor[];
}

export async function getBookBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_books")
    .select(BOOK_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return failed("book", error, null);
  return (data as unknown as BookWithAuthor | null) ?? null;
}

export async function getBookById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_books")
    .select(BOOK_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) return failed("book", error, null);
  return (data as unknown as BookWithAuthor | null) ?? null;
}

export async function listAuthors() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_authors")
    .select("*")
    .eq("status", "active")
    .order("name");
  if (error) return failed("listAuthors", error, []);
  return (data ?? []) as Author[];
}

export async function getAuthorBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return failed("author", error, null);
  return (data as Author | null) ?? null;
}

export async function listBooksByAuthor(authorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_books")
    .select(BOOK_SELECT)
    .eq("author_id", authorId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) return failed("booksByAuthor", error, []);
  return (data ?? []) as unknown as BookWithAuthor[];
}

/** Real catalogue counts — no invented figures anywhere on the site. */
export async function getStoreStats() {
  const supabase = await createSupabaseServerClient();
  const [{ count: titles }, { count: authors }] = await Promise.all([
    supabase.from("ink_books").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("ink_authors").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return { titles: titles ?? 0, authors: authors ?? 0 };
}

export async function getCategoryCounts() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_books")
    .select("category")
    .eq("status", "published");
  const counts = new Map<string, number>();
  (data ?? []).forEach((row: { category: string }) => {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  });
  return counts;
}

export async function getLibrary(readerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_entitlements")
    .select(
      `id, created_at, order_item_id,
       book:ink_books!ink_entitlements_book_id_fkey (
         id, title, slug, subtitle, cover_path, ebook_format, pages, ebook_size_bytes,
         author:ink_authors!ink_books_author_id_fkey ( name, slug )
       )`,
    )
    .eq("reader_id", readerId)
    .order("created_at", { ascending: false });
  if (error) return failed("readerQuery", error, []);
  return data ?? [];
}

export async function getWishlist(readerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_wishlist")
    .select(
      `book_id, created_at,
       book:ink_books!ink_wishlist_book_id_fkey (
         id, title, slug, subtitle, description, price_kobo, cover_path, category,
         author:ink_authors!ink_books_author_id_fkey ( name, slug )
       )`,
    )
    .eq("reader_id", readerId)
    .order("created_at", { ascending: false });
  if (error) return failed("readerQuery", error, []);
  return data ?? [];
}

export async function getOrders(readerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ink_orders")
    .select(
      `id, reference, status, total_kobo, created_at, paid_at,
       items:ink_order_items ( id, title, unit_price_kobo, book_id )`,
    )
    .eq("reader_id", readerId)
    .order("created_at", { ascending: false });
  if (error) return failed("readerQuery", error, []);
  return data ?? [];
}

export async function isInWishlist(readerId: string, bookId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_wishlist")
    .select("book_id")
    .eq("reader_id", readerId)
    .eq("book_id", bookId)
    .maybeSingle();
  return Boolean(data);
}

export async function ownsBook(readerId: string, bookId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_entitlements")
    .select("book_id")
    .eq("reader_id", readerId)
    .eq("book_id", bookId)
    .maybeSingle();
  return Boolean(data);
}

export type { Book };
