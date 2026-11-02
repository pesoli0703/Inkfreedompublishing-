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
};

export type CoverMotif = "rules" | "arch" | "monogram" | "spine" | "grid";

export type CoverDesign = {
  /** Background colour of the cover */
  bg: string;
  /** Title / primary type colour */
  ink: string;
  /** Accent rule + ornament colour */
  accent: string;
  motif: CoverMotif;
};

export type Format = {
  /** Format name for preview data, or the book_formats uuid for live titles. */
  id: string;
  label: string;
  /** Entry price in NGN, used when a book comes from the preview dataset. */
  price: number;
  available: boolean;
  /** Present for titles read from Supabase, alongside the priced offers. */
  bookFormatId?: string;
};

export type Author = {
  slug: string;
  name: string;
  /** Short editorial description — no invented awards or sales figures. */
  tagline: string;
  bio: string[];
  based: string;
  writingIn: string;
  categories: CategorySlug[];
  featured?: boolean;
  initials: string;
};

export type Book = {
  slug: string;
  title: string;
  subtitle?: string;
  authorSlug: string;
  category: CategorySlug;
  /** Entry price, in NGN, used on cards */
  price: number;
  formats: Format[];
  languages: string;
  pages: number;
  /** One-sentence hook for cards */
  hook: string;
  description: string[];
  themes: string[];
  /** Short sample passage shown in the preview area on the book page */
  excerpt: { label: string; body: string[] };
  cover: CoverDesign;
  featured?: boolean;
  /** Position in the "new & noteworthy" ordering */
  order: number;
};

export const CURRENCY = "NGN";
