import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/studio", "/library", "/orders", "/account", "/checkout", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
