import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://inkfreedompublishing.vercel.app"),
  title: {
    default: "INKFREEDOMPUBLISHING — Independent Publishing House",
    template: "%s · INKFREEDOMPUBLISHING",
  },
  description:
    "A premium independent publishing house and digital marketplace for considered books — fiction and non-fiction, poetry and drama, business, children's, young adult and academic titles.",
  keywords: [
    "independent publishing",
    "book marketplace",
    "literary fiction",
    "poetry",
    "African publishing",
  ],
  openGraph: {
    title: "INKFREEDOMPUBLISHING",
    description:
      "Considered books from independent authors — edited, designed and sold with intent.",
    type: "website",
    siteName: "INKFREEDOMPUBLISHING",
  },
};

export const viewport: Viewport = {
  themeColor: "#101C32",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
        >
          Skip to content
        </a>
        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
