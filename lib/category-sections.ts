import type { Category } from "./data/types";

/**
 * The six top-level sections a shelf can belong to.
 *
 * The slugs are mirrored by the `categories.section` check constraint in
 * `supabase/migrations/0023_category_taxonomy.sql`, so a shelf can never be
 * filed under a section no page knows how to render. Order here is the order
 * sections appear on the storefront.
 */
export type CategorySection = {
  slug: string;
  name: string;
  blurb: string;
};

export const CATEGORY_SECTIONS: CategorySection[] = [
  {
    slug: "fiction",
    name: "Fiction",
    blurb: "Novels, stories and drawn work, from literary fiction to speculative futures.",
  },
  {
    slug: "non-fiction",
    name: "Non-Fiction",
    blurb: "Essays, history, science, memoir and practical books about living.",
  },
  {
    slug: "business-money",
    name: "Business & Money",
    blurb: "Building something, running it, and keeping the numbers honest.",
  },
  {
    slug: "poetry-drama",
    name: "Poetry & Drama",
    blurb: "Collections, plays and writing made for the page and the stage.",
  },
  {
    slug: "children-young-adult",
    name: "Children & Young Adult",
    blurb: "Picture books through to fiction written for teenagers.",
  },
  {
    slug: "textbooks-academic",
    name: "Textbooks & Academic",
    blurb: "Course texts, research and professional reference.",
  },
];

/** Where a shelf with an unrecognised section is filed. */
const OTHER_SECTION: CategorySection = {
  slug: "more-shelves",
  name: "More shelves",
  blurb: "Shelves that are not yet filed under a section.",
};

export type CategoryGroup = {
  section: CategorySection;
  categories: Category[];
  /** Published titles across every shelf in the section. */
  count: number;
};

/**
 * Group shelves by section, preserving the order of `CATEGORY_SECTIONS` and the
 * shelf order the database returned. Empty sections are dropped, so a section
 * with no visible shelves never renders a heading with nothing under it.
 */
export function groupCategoriesBySection(categories: Category[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const bySection = new Map<string, Category[]>();

  for (const category of categories) {
    const known = CATEGORY_SECTIONS.some((section) => section.slug === category.section);
    const key = known ? category.section : OTHER_SECTION.slug;
    const bucket = bySection.get(key);
    if (bucket) bucket.push(category);
    else bySection.set(key, [category]);
  }

  for (const section of CATEGORY_SECTIONS) {
    const shelves = bySection.get(section.slug);
    if (!shelves || shelves.length === 0) continue;
    groups.push({
      section,
      categories: shelves,
      count: shelves.reduce((total, shelf) => total + shelf.count, 0),
    });
  }

  const other = bySection.get(OTHER_SECTION.slug);
  if (other && other.length > 0) {
    groups.push({
      section: OTHER_SECTION,
      categories: other,
      count: other.reduce((total, shelf) => total + shelf.count, 0),
    });
  }

  return groups;
}

/** Section lookup for a single shelf, used on the filtered catalogue page. */
export function sectionForSlug(slug: string): CategorySection | undefined {
  return (
    CATEGORY_SECTIONS.find((section) => section.slug === slug) ??
    (slug === OTHER_SECTION.slug ? OTHER_SECTION : undefined)
  );
}
