import { authors, getAuthor } from "./data/authors";
import { books } from "./data/books";
import { categories } from "./data/categories";
import type { Book, CategorySlug } from "./data/types";

export type SortKey = "curated" | "price-asc" | "price-desc" | "title";

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "curated", label: "Curated order" },
  { value: "title", label: "Title A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export const getBook = (slug: string) => books.find((book) => book.slug === slug);

export const getCategory = (slug: string) =>
  categories.find((category) => category.slug === slug);

export const categoryName = (slug: CategorySlug) =>
  getCategory(slug)?.name ?? "Catalogue";

export const booksByAuthor = (authorSlug: string) =>
  books.filter((book) => book.authorSlug === authorSlug);

export const authorName = (authorSlug: string) =>
  getAuthor(authorSlug)?.name ?? "INKFREEDOMPUBLISHING";

export const featuredBooks = [...books]
  .sort((a, b) => a.order - b.order)
  .slice(0, 4);

export const featuredAuthors = authors.filter((author) => author.featured);

export const categoryCounts = () =>
  categories.map((category) => ({
    ...category,
    count: books.filter((book) => book.category === category.slug).length,
  }));

export const relatedBooks = (book: Book, limit = 3) =>
  books
    .filter((candidate) => candidate.slug !== book.slug)
    .sort((a, b) => {
      const score = (candidate: Book) =>
        (candidate.category === book.category ? 2 : 0) +
        (candidate.authorSlug === book.authorSlug ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);

const normalise = (value: string) => value.trim().toLowerCase();

/** Loose catalogue search across titles, authors, categories and themes. */
export const searchBooks = (
  query: string,
  list: Book[] = books,
): Book[] => {
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
      authorName(book.authorSlug),
      categoryName(book.category),
    ]
      .join(" ")
      .toLowerCase();

    return words.every((word) => haystack.includes(word));
  });
};

/** Authors matching a query, used by the search results summary. */
export const searchAuthors = (query: string) => {
  const term = normalise(query);
  if (!term) return [];
  return authors.filter((author) =>
    [author.name, author.tagline, author.writingIn, author.based]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
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

export const browseBooks = ({
  q = "",
  category,
  sort = "curated",
}: {
  q?: string;
  category?: string;
  sort?: SortKey;
}) => {
  let list = searchBooks(q);
  const validCategory = categories.find((item) => item.slug === category);
  if (validCategory) {
    list = list.filter((book) => book.category === validCategory.slug);
  }
  return sortBooks(list, sort);
};
