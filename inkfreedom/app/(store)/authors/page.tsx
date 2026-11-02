import type { Metadata } from "next";
import Link from "next/link";
import { coverPalette } from "@/components/book-cover";
import { Eyebrow } from "@/components/ui";
import { getAuthorsPreview } from "@/lib/home";

export const metadata: Metadata = {
  title: "Authors",
  description: "The writers publishing directly on Inkfreedom.",
};

export default async function AuthorsPage() {
  const authors = await getAuthorsPreview(100);

  return (
    <>
      <section className="border-b border-line bg-paper-deep">
        <div className="shell py-12 md:py-16">
          <Eyebrow>The people writing</Eyebrow>
          <h1 className="display-lg mt-4 text-ink">Authors</h1>
          <p className="mt-4 max-w-xl text-[0.92rem] leading-relaxed text-ink-muted">
            Every title on Inkfreedom is sold by the person who wrote it. These are
            their pages, their catalogues and their terms.
          </p>
        </div>
      </section>

      <section className="shell py-12 md:py-16">
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => {
            const palette = coverPalette(author.top_category);
            return (
              <Link
                key={author.id}
                href={`/authors/${author.slug}`}
                className="group flex flex-col justify-between gap-10 bg-paper p-7 transition-colors hover:bg-paper-card"
              >
                <div>
                  <span
                    className="grid h-14 w-14 place-items-center rounded-full font-display text-[1.5rem]"
                    style={{ backgroundColor: palette.bg, color: palette.ink }}
                  >
                    {author.name.slice(0, 1)}
                  </span>
                  <h2 className="mt-5 font-display text-[1.75rem] leading-tight text-ink transition-colors group-hover:text-ember">
                    {author.name}
                  </h2>
                  {author.tagline ? (
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">
                      {author.tagline}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-line pt-4">
                  <span className="label text-ink-muted">
                    {author.titles} {author.titles === 1 ? "title" : "titles"}
                  </span>
                  <span aria-hidden="true" className="text-ink-muted transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {authors.length === 0 ? (
          <p className="py-16 text-center text-ink-muted">
            No author pages yet. The first ones will appear here.
          </p>
        ) : null}
      </section>
    </>
  );
}
