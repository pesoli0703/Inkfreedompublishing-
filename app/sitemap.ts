import type { MetadataRoute } from "next";
import { books } from "@/lib/data/books";
import { authors } from "@/lib/data/authors";

const base = "https://inkfreedompublishing.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/books", "/categories", "/authors", "/about", "/publish", "/policies"];

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
    ...authors.map((author) => ({
      url: `${base}/authors/${author.slug}`,
      lastModified: new Date(),
      priority: 0.5,
    })),
  ];
}
