import type { Book, Category } from "./data/types";

export type SortKey = "curated" | "price-asc" | "price-desc" | "title";

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "curated", label: "Curated order" },
  { value: "title", label: "Title A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/**
 * Pure helpers over catalogue records. These take the list they should work on:
 * nothing here reads a bundled dataset, so the public pages can only ever
 * render titles that exist in the database.
 */

export const categoryName = (categories: Category[], slug: string) =>
  categories.find((category) => category.slug === slug)?.name ?? "Catalogue";

export const authorName = (book: Book) =>
  book.authorName || "INKFREEDOMPUBLISHING";

const normalise = (value: string) => value.trim().toLowerCase();

/** Loose search across titles, authors, categories and themes. */
export const searchBooks = (query: string, list: Book[]): Book[] => {
  const term = normalise(query);
  if (!term) return list;

  const words = term.split(/\s+/).filter(Boolean);

  return list.filter((book) => {
    const haystack = [
      book.title,
      book.subtitle ?? "",
      book.hook,
      book.description.join(" "),
      book.themes.join(" "),
      book.authorName,
      book.bookCode ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return words.every((word) => haystack.includes(word));
  });
};

export const sortBooks = (list: Book[], sort: SortKey): Book[] => {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "curated":
    default:
      return copy.sort((a, b) => a.order - b.order);
  }
};

export const browseBooks = (
  list: Book[],
  {
    q = "",
    category,
    sort = "curated",
  }: { q?: string; category?: string; sort?: SortKey },
) => {
  let results = searchBooks(q, list);
  if (category) {
    results = results.filter((book) => book.category === category);
  }
  return sortBooks(results, sort);
};
