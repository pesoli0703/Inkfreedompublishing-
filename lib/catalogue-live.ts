import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Author,
  Book,
  Category,
  CategorySlug,
  CoverDesign,
  Format,
} from "@/lib/data/types";

/**
 * The public catalogue, read from Supabase.
 *
 * Every page renders these records and nothing else. There is no preview or
 * sample dataset to fall back to: when the database holds no published titles
 * the loaders return empty arrays and the pages show an honest empty state.
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
  live: true;
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

/** Deterministic fallback cover, so a title without artwork still has a spine. */
const coverFor = (slug: string, index: number): CoverDesign => {
  const palette = PALETTES[(hash(slug) + index) % PALETTES.length];
  return { ...palette, motif: MOTIFS[hash(slug) % MOTIFS.length] };
};

/** eBooks only: every offer is a digital edition. */
const FORMAT_LABELS: Record<string, string> = {
  ebook: "eBook",
};

const FORMAT_ORDER = ["ebook"];

export const formatLabelFor = (format: string) =>
  FORMAT_LABELS[format] ?? format.replace(/_/g, " ");

const naira = (minor: number) => Math.round(minor) / 100;

/** Cheapest active NGN offer becomes the card price. */
const entryPrice = (offers: LiveOffer[]) => {
  const ngn = offers.filter((offer) => offer.currency === "NGN");
  if (ngn.length === 0) return 0;
  return naira(Math.min(...ngn.map((offer) => offer.priceMinor)));
};

type PublishedRow = {
  id: string;
  book_code: string | null;
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
  category_name: string | null;
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

export function toLiveBook(
  row: PublishedRow,
  offers: LiveOffer[],
  index: number,
): LiveBook {
  const formats: Format[] = [...offers]
    .sort(
      (a, b) => FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format),
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
    bookCode: row.book_code,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    authorSlug: row.author_slug ?? "",
    authorName: row.author_name ?? "INKFREEDOMPUBLISHING",
    category: (row.category_slug ?? "literary-fiction") as CategorySlug,
    categoryName: row.category_name ?? "Catalogue",
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
    coverPath: row.cover_path ?? null,
    featured: row.is_featured ?? false,
    order: index,
    offers,
    currencies: [...new Set(offers.map((offer) => offer.currency))],
    live: true,
  };
}

const COLUMNS =
  "id, book_code, slug, title, subtitle, hook, description_paragraphs, excerpt_label, excerpt_body, themes, language, page_count, cover_path, is_featured, published_at, category_slug, category_name, author_slug, author_name";

/** Published titles with every resolvable offer, featured first, then newest. */
export async function loadLiveCatalogue(): Promise<LiveBook[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("published_books")
    .select(COLUMNS)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(200);

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

  return (rows as unknown as PublishedRow[])
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
    .eq("book_id", (row as unknown as PublishedRow).id);

  const offers: LiveOffer[] = ((offerRows ?? []) as OfferRow[]).map((offer) => ({
    bookFormatId: offer.book_format_id,
    format: offer.format,
    currency: offer.currency,
    priceMinor: Number(offer.price_minor),
    source: offer.source,
  }));

  if (offers.length === 0) return null;
  return toLiveBook(row as unknown as PublishedRow, offers, 0);
}

/** Active shelves, with a live count of published titles on each. */
export async function loadCategories(): Promise<Category[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [{ data: rows }, catalogue] = await Promise.all([
    supabase
      .from("categories")
      .select("slug, name, blurb, note, section, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    loadLiveCatalogue(),
  ]);

  if (!rows) return [];

  return (
    rows as unknown as {
      slug: CategorySlug;
      name: string;
      blurb: string;
      note: string;
      section: string;
    }[]
  ).map((row) => ({
    ...row,
    count: catalogue.filter((book) => book.category === row.slug).length,
  }));
}

/** Approved authors, with the number of published titles each has on the list. */
export async function loadLiveAuthors(): Promise<Author[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [{ data: rows }, catalogue] = await Promise.all([
    supabase
      .from("author_profiles")
      .select("slug, pen_name, tagline, bio, based_in, writing_in, avatar_path")
      .eq("status", "approved")
      .order("pen_name"),
    loadLiveCatalogue(),
  ]);

  if (!rows) return [];

  const counts = new Map<string, number>();
  for (const book of catalogue) {
    if (!book.authorSlug) continue;
    counts.set(book.authorSlug, (counts.get(book.authorSlug) ?? 0) + 1);
  }

  return (rows as unknown as AuthorRow[]).map((row) =>
    toAuthor(row, counts.get(row.slug) ?? 0),
  );
}

export async function loadLiveAuthor(slug: string): Promise<Author | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("author_profiles")
    .select("slug, pen_name, tagline, bio, based_in, writing_in, avatar_path")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (!row) return null;

  const catalogue = await loadLiveCatalogue();
  const titles = catalogue.filter((book) => book.authorSlug === slug).length;
  return toAuthor(row as unknown as AuthorRow, titles);
}

type AuthorRow = {
  slug: string;
  pen_name: string | null;
  tagline: string | null;
  bio: string | null;
  based_in: string | null;
  writing_in: string | null;
  avatar_path: string | null;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "IF";

const toAuthor = (row: AuthorRow, titles: number): Author => {
  const name = row.pen_name ?? "INKFREEDOMPUBLISHING";
  return {
    slug: row.slug,
    name,
    tagline: row.tagline ?? "",
    bio: (row.bio ?? "")
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    based: row.based_in ?? "Not stated",
    writingIn: row.writing_in ?? "Writing",
    initials: initialsOf(name),
    avatarPath: row.avatar_path,
    titles,
  };
};

/** Public URL for artwork held in the public `book-covers` bucket. */
export const publicAssetUrl = (bucket: string, path: string | null) => {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
};
