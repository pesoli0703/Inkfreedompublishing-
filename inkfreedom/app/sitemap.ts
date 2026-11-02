import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/config";
import { listAuthors, listBooks } from "@/lib/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/books", "/authors", "/publish", "/about", "/terms", "/privacy"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  try {
    const [books, authors] = await Promise.all([listBooks({ limit: 500 }), listAuthors()]);

    return [
      ...staticRoutes,
      ...books.map((book) => ({
        url: `${siteUrl}/books/${book.slug}`,
        lastModified: book.updated_at ? new Date(book.updated_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...authors.map((author) => ({
        url: `${siteUrl}/authors/${author.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
