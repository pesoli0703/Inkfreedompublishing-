/**
 * Shapes shared by the public catalogue pages.
 *
 * The site renders only real catalogue data: every `Book`, `Author` and
 * `Category` below is mapped from Supabase in `lib/catalogue-live.ts`. There is
 * no preview dataset — an empty database means an empty catalogue, and the
 * pages say so.
 */

export type CategorySlug =
  | "literary-fiction"
  | "poetry"
  | "essays-criticism"
  | "memoir"
  | "business-leadership"
  | "children-young-readers";

export type Category = {
  slug: CategorySlug;
  name: string;
  blurb: string;
  /** Short line used on category tiles */
  note: string;
  /** Number of published titles on this shelf */
  count: number;
};

export type CoverMotif = "rules" | "arch" | "monogram" | "spine" | "grid";

/**
 * Fallback cover styling used when a title has no uploaded artwork yet. It is
 * generated from the book's own slug, so it is stable across renders.
 */
export type CoverDesign = {
  bg: string;
  ink: string;
  accent: string;
  motif: CoverMotif;
};

export type Format = {
  /** The book_formats uuid for live titles. */
  id: string;
  label: string;
  /** Entry price in NGN. */
  price: number;
  available: boolean;
  bookFormatId?: string;
};

export type Author = {
  slug: string;
  name: string;
  /** Short editorial description written by the author — no invented awards. */
  tagline: string;
  bio: string[];
  based: string;
  writingIn: string;
  initials: string;
  avatarPath: string | null;
  /** Number of published titles by this author */
  titles: number;
};

export type Book = {
  slug: string;
  title: string;
  subtitle?: string;
  authorSlug: string;
  authorName: string;
  category: CategorySlug;
  /** Human-readable shelf name, e.g. "Literary Fiction" */
  categoryName: string;
  /** Platform-assigned Book ID, e.g. INK-BK-000001. Never the same as an ISBN. */
  bookCode: string | null;
  /** Entry price, in NGN, used on cards */
  price: number;
  formats: Format[];
  languages: string;
  pages: number;
  hook: string;
  description: string[];
  themes: string[];
  excerpt: { label: string; body: string[] };
  cover: CoverDesign;
  /** Path in the public `book-covers` bucket, when artwork has been uploaded. */
  coverPath: string | null;
  featured?: boolean;
  /** Position in the catalogue ordering */
  order: number;
};

export const CURRENCY = "NGN";
