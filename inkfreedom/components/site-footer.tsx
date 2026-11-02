import Link from "next/link";
import { Wordmark } from "./brand";

const COLUMNS = [
  {
    title: "Read",
    links: [
      { href: "/books", label: "The shelf" },
      { href: "/authors", label: "Authors" },
      { href: "/library", label: "My library" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Publish",
    links: [
      { href: "/publish", label: "Sell your ebook" },
      { href: "/publish#terms", label: "Terms for authors" },
      { href: "/studio", label: "Author studio" },
      { href: "/publish#formats", label: "PDF & ePub" },
    ],
  },
  {
    title: "The press",
    links: [
      { href: "/about", label: "About Inkfreedom" },
      { href: "/about#contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink text-paper">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          <div>
            <Wordmark tone="paper" size="lg" />
            <p className="mt-5 max-w-xs text-[0.9rem] leading-relaxed text-paper/60">
              An independent press for ebooks. Writers publish directly, readers buy
              directly, and the author keeps the larger share.
            </p>
            <p className="label mt-8 text-paper/40">Lagos · Everywhere</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="label text-paper/40">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.875rem] text-paper/75 transition-colors hover:text-paper"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-paper/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-paper/40">
            © {new Date().getFullYear()} Inkfreedom. Every ebook is sold by its author.
          </p>
          <p className="text-xs text-paper/40">
            Built for reading — ePub for phones and readers, PDF for screens and print.
          </p>
        </div>
      </div>
    </footer>
  );
}
