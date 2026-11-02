import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LiveOffer = {
  bookFormatId: string;
  format: string;
  currency: string;
  priceMinor: number;
  source: string;
};

export type LiveBook = {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  authorSlug: string;
  coverPath: string | null;
  offers: LiveOffer[];
  currencies: string[];
};

/**
 * Reads the published catalogue from Supabase. Returns an empty list when the
 * database is not configured or has no published titles, so callers can fall
 * back to the design preview deliberately rather than by accident.
 */
export async function getLiveBooks(limit = 60): Promise<LiveBook[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("book_offers_resolved")
    .select("book_id, slug, title, author_name, author_slug, cover_path, book_format_id, format, currency, price_minor, source")
    .limit(limit * 6);

  if (error || !data) return [];

  const map = new Map<string, LiveBook>();
  for (const row of data) {
    const existing = map.get(row.book_id as string) ?? {
      id: row.book_id as string,
      slug: row.slug as string,
      title: row.title as string,
      authorName: (row.author_name as string) ?? "INKFREEDOMPUBLISHING",
      authorSlug: (row.author_slug as string) ?? "",
      coverPath: (row.cover_path as string) ?? null,
      offers: [],
      currencies: [],
    };
    existing.offers.push({
      bookFormatId: row.book_format_id as string,
      format: row.format as string,
      currency: row.currency as string,
      priceMinor: Number(row.price_minor),
      source: row.source as string,
    });
    if (!existing.currencies.includes(row.currency as string)) {
      existing.currencies.push(row.currency as string);
    }
    map.set(row.book_id as string, existing);
  }

  return [...map.values()].slice(0, limit);
}

export async function getLiveBookBySlug(slug: string): Promise<LiveBook | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("book_offers_resolved")
    .select("book_id, slug, title, author_name, author_slug, cover_path, book_format_id, format, currency, price_minor, source")
    .eq("slug", slug);

  if (error || !data || data.length === 0) return null;

  const first = data[0];
  return {
    id: first.book_id as string,
    slug: first.slug as string,
    title: first.title as string,
    authorName: (first.author_name as string) ?? "INKFREEDOMPUBLISHING",
    authorSlug: (first.author_slug as string) ?? "",
    coverPath: (first.cover_path as string) ?? null,
    offers: data.map((row) => ({
      bookFormatId: row.book_format_id as string,
      format: row.format as string,
      currency: row.currency as string,
      priceMinor: Number(row.price_minor),
      source: row.source as string,
    })),
    currencies: [...new Set(data.map((row) => row.currency as string))],
  };
}

export const publicCoverUrl = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-covers/${path}` : null;
