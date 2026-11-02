import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { BookWithAuthor } from "./types";
import { getCategoryCounts, getStoreStats, listBooks } from "./queries";

export { getCategoryCounts, getStoreStats };

const PREVIEW_SELECT = `
  id, author_id, title, slug, subtitle, description, category, language,
  price_kobo, cover_path, ebook_path, ebook_format, ebook_size_bytes, pages,
  isbn, status, review_note, submitted_at, published_at, created_at, updated_at,
  author:ink_authors!ink_books_author_id_fkey ( id, slug, name, tagline )
`;

export async function getHomepageBooks(): Promise<BookWithAuthor[]> {
  return listBooks({ sort: "newest", limit: 8 });
}

export type AuthorPreview = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  titles: number;
  top_category: string;
};

export async function getAuthorsPreview(limit = 3): Promise<AuthorPreview[]> {
  const supabase = await createSupabaseServerClient();

  const { data: books } = await supabase
    .from("ink_books")
    .select("author_id, category, author:ink_authors!ink_books_author_id_fkey ( id, name, slug, tagline )")
    .eq("status", "published");

  const byAuthor = new Map<string, AuthorPreview>();

  for (const row of (books ?? []) as unknown as Array<{
    author_id: string;
    category: string;
    author: { id: string; name: string; slug: string; tagline: string | null } | null;
  }>) {
    if (!row.author) continue;
    const existing = byAuthor.get(row.author_id);
    if (existing) {
      existing.titles += 1;
    } else {
      byAuthor.set(row.author_id, {
        id: row.author.id,
        name: row.author.name,
        slug: row.author.slug,
        tagline: row.author.tagline,
        titles: 1,
        top_category: row.category,
      });
    }
  }

  return [...byAuthor.values()].sort((a, b) => b.titles - a.titles).slice(0, limit);
}

export { PREVIEW_SELECT };
