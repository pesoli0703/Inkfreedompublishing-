import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { siteUrl } from "@/lib/supabase/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Inkfreedom — an independent press for ebooks",
    template: "%s · Inkfreedom",
  },
  description:
    "Inkfreedom is an independent ebook press. Writers publish PDF and ePub editions directly, readers buy directly, and authors keep 90% of every sale.",
  keywords: ["ebooks", "independent publishing", "ePub", "PDF", "Nigerian authors", "bookstore"],
  openGraph: {
    type: "website",
    siteName: "Inkfreedom",
    title: "Inkfreedom — an independent press for ebooks",
    description:
      "Publish directly. Read directly. Authors keep 90% of every sale on Inkfreedom.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
