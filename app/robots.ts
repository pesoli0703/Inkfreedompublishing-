import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/signin"] }],
    sitemap: "https://inkfreedompublishing.vercel.app/sitemap.xml",
  };
}
