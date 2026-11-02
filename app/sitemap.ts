import type { MetadataRoute } from "next";
import { loadLiveAuthors, loadLiveCatalogue } from "@/lib/catalogue-live";

const base = "https://inkfreedompublishing.vercel.app";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "",
    "/books",
    "/categories",
    "/authors",
    "/about",
    "/publish",
    "/policies",
    "/register",
    "/contact",
    "/faq",
    "/terms",
    "/privacy",
    "/refunds",
    "/withdrawal-policy",
    "/author-agreement",
    "/copyright",
  ];

  // Only published titles and approved authors are indexable.
  const [books, authors] = await Promise.all([
    loadLiveCatalogue(),
    loadLiveAuthors(),
  ]);

  return [
    ...pages.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      priority: path === "" ? 1 : 0.7,
    })),
    ...books.map((book) => ({
      url: `${base}/books/${book.slug}`,
      lastModified: new Date(),
      priority: 0.6,
    })),
    ...authors
      .filter((author) => author.titles > 0)
      .map((author) => ({
        url: `${base}/authors/${author.slug}`,
        lastModified: new Date(),
        priority: 0.5,
      })),
  ];
}
