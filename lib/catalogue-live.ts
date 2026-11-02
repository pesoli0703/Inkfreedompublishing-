import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Book,
  CategorySlug,
  CoverDesign,
  Format,
} from "@/lib/data/types";

/**
 * Reads the published catalogue from Supabase and maps it onto the shape the
 * public pages already render. When the database is not configured, or holds no
 * published titles, callers fall back to the labelled preview dataset — the
 * fallback is explicit (`isPreview`), never silent.
 */

export type LiveOffer = {
  bookFormatId: string;
  format: string;
  currency: string;
  priceMinor: number;
  source: string;
};

export type LiveBook = Book & {
  id: string;
  offers: LiveOffer[];
  currencies: string[];
  coverPath: string | null;
  live: true;
};

export type CatalogueResult = {
  books: Book[];
  live: LiveBook[];
  isPreview: boolean;
};

const PALETTES: CoverDesign[] = [
  { bg: "#101C32", ink: "#F7F3EA", accent: "#C6A15B", motif: "rules" },
  { bg: "#F4EFE3", ink: "#101C32", accent: "#8A5A2B", motif: "arch" },
  { bg: "#26382F", ink: "#F2EFE4", accent: "#C6A15B", motif: "monogram" },
  { bg: "#7B2D26", ink: "#FBF6EC", accent: "#E2C593", motif: "spine" },
  { bg: "#1E2B4A", ink: "#F1EDE3", accent: "#9DB4C0", motif: "grid" },
  { bg: "#3C2F2F", ink: "#F6EFE4", accent: "#C9A227", motif: "arch" },
];

const MOTIFS: CoverDesign["motif"][] = ["rules", "arch", "monogram", "spine", "grid"];

const hash = (value: string) => {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 100000;
  }
  return total;
};

/** Deterministic cover styling so a title always looks the same. */
const coverFor = (slug: string, index: number): CoverDesign => {
  const palette = PALETTES[(hash(slug) + index) % PALETTES.length];
  return { ...palette, motif: MOTIFS[hash(slug) % MOTIFS.length] };
};

const FORMAT_LABELS: Record<string, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "Ebook",
};

const FORMAT_ORDER = ["hardcover", "paperback", "ebook"];

export const formatLabelFor = (format: string) =>
  FORMAT_LABELS[format] ?? format.replace(/_/g, " ");

type PublishedRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  hook: string | null;
  description_paragraphs: string[] | null;
  excerpt_label: string | null;
  excerpt_body: string[] | null;
  themes: string[] | null;
  language: string | null;
  page_count: number | null;
  cover_path: string | null;
  is_featured: boolean | null;
  published_at: string | null;
  category_slug: string | null;
  author_slug: string | null;
  author_name: string | null;
};

type OfferRow = {
  book_id: string;
  book_format_id: string;
  format: string;
  currency: string;
  price_minor: number;
  source: string;
};

const naira = (minor: number) => Math.round(minor) / 100;

/** Cheapest active NGN offer becomes the card price. */
const entryPrice = (offers: LiveOffer[]) => {
  const ngn = offers.filter((offer) => offer.currency === "NGN");
  if (ngn.length === 0) return 0;
  return naira(Math.min(...ngn.map((offer) => offer.priceMinor)));
};

export function toLiveBook(
  row: PublishedRow,
  offers: LiveOffer[],
  index: number,
): LiveBook {
  const formats: Format[] = [...offers]
    .sort(
      (a, b) =>
        FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format),
    )
    .map((offer) => ({
      id: offer.bookFormatId,
      label: formatLabelFor(offer.format),
      price: naira(offer.priceMinor),
      available: true,
      bookFormatId: offer.bookFormatId,
    }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    authorSlug: row.author_slug ?? "",
    category: (row.category_slug ?? "literary-fiction") as CategorySlug,
    price: entryPrice(offers),
    formats,
    languages: row.language ?? "English",
    pages: row.page_count ?? 0,
    hook: row.hook ?? "",
    description: row.description_paragraphs ?? [],
    themes: row.themes ?? [],
    excerpt: {
      label: row.excerpt_label ?? "Sample",
      body: row.excerpt_body ?? [],
    },
    cover: coverFor(row.slug, index),
    featured: row.is_featured ?? false,
    order: index,
    offers,
    currencies: [...new Set(offers.map((offer) => offer.currency))],
    coverPath: row.cover_path ?? null,
    live: true,
  };
}

const COLUMNS =
  "id, slug, title, subtitle, hook, description_paragraphs, excerpt_label, excerpt_body, themes, language, page_count, cover_path, is_featured, published_at, category_slug, author_slug, author_name";

/** Published titles with every resolvable offer, newest/featured first. */
export async function loadLiveCatalogue(): Promise<LiveBook[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("published_books")
    .select(COLUMNS)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(120);

  if (error || !rows || rows.length === 0) return [];

  const { data: offerRows } = await supabase
    .from("book_offers_resolved")
    .select("book_id, book_format_id, format, currency, price_minor, source");

  const byBook = new Map<string, LiveOffer[]>();
  for (const offer of (offerRows ?? []) as OfferRow[]) {
    const list = byBook.get(offer.book_id) ?? [];
    list.push({
      bookFormatId: offer.book_format_id,
      format: offer.format,
      currency: offer.currency,
      priceMinor: Number(offer.price_minor),
      source: offer.source,
    });
    byBook.set(offer.book_id, list);
  }

  return (rows as PublishedRow[])
    .map((row, index) => ({
      row,
      index,
      offers: byBook.get(row.id) ?? [],
    }))
    .filter((entry) => entry.offers.length > 0)
    .map((entry) => toLiveBook(entry.row, entry.offers, entry.index));
}

export async function loadLiveBook(slug: string): Promise<LiveBook | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("published_books")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row) return null;

  const { data: offerRows } = await supabase
    .from("book_offers_resolved")
    .select("book_id, book_format_id, format, currency, price_minor, source")
    .eq("book_id", (row as PublishedRow).id);

  const offers: LiveOffer[] = ((offerRows ?? []) as OfferRow[]).map((offer) => ({
    bookFormatId: offer.book_format_id,
    format: offer.format,
    currency: offer.currency,
    priceMinor: Number(offer.price_minor),
    source: offer.source,
  }));

  if (offers.length === 0) return null;
  return toLiveBook(row as PublishedRow, offers, 0);
}

export type LiveAuthor = {
  slug: string;
  name: string;
  based: string | null;
  avatarPath: string | null;
};

export async function loadLiveAuthors(): Promise<LiveAuthor[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("published_books")
    .select("author_slug, author_name, based_in, author_avatar_path");

  if (error || !data) return [];

  const map = new Map<string, LiveAuthor>();
  for (const row of data as {
    author_slug: string | null;
    author_name: string | null;
    based_in: string | null;
    author_avatar_path: string | null;
  }[]) {
    if (!row.author_slug) continue;
    if (!map.has(row.author_slug)) {
      map.set(row.author_slug, {
        slug: row.author_slug,
        name: row.author_name ?? "INKFREEDOMPUBLISHING",
        based: row.based_in,
        avatarPath: row.author_avatar_path,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
