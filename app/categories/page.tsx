import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { loadCategories, loadLiveCatalogue } from "@/lib/catalogue-live";

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Browse the INKFREEDOMPUBLISHING catalogue by category — literary fiction, poetry, essays, memoir, business and children's books.",
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const [counts, catalogue] = await Promise.all([
    loadCategories(),
    loadLiveCatalogue(),
  ]);

  return (
    <>
      <section className="border-b border-line bg-white paper-texture">
        <div className="container-editorial py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">Categories</span>
          </nav>

          <p className="eyebrow mt-6 text-gold-deep">The list</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            The shelves of the catalogue
          </h1>
          <p className="mt-5 max-w-2xl text-[0.97rem] leading-relaxed text-charcoal-soft">
            Each area is edited separately, so the books on a shelf share a
            sensibility as well as a subject.
          </p>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {counts.map((category) => {
            const previews = catalogue
              .filter((book) => book.category === category.slug)
              .slice(0, 3);

            return (
              <article
                key={category.slug}
                className="group relative border border-line bg-white p-7 transition-colors duration-300 hover:border-gold/60 sm:p-9"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl leading-tight text-navy sm:text-3xl">
                      {category.name}
                    </h2>
                    <p className="mt-2 text-[0.7rem] tracking-[0.16em] text-charcoal-soft uppercase">
                      {category.note} ·{" "}
                      {category.count === 0
                        ? "no titles yet"
                        : `${category.count} ${category.count === 1 ? "title" : "titles"}`}
                    </p>
                  </div>

                  {previews.length > 0 ? (
                    <div className="flex -space-x-4">
                      {previews.map((book) => (
                        <div key={book.slug} className="w-10 sm:w-12">
                          <BookCover book={book} decorative />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <p className="mt-5 max-w-md text-[0.9rem] leading-relaxed text-charcoal-soft">
                  {category.blurb}
                </p>

                <Link
                  href={`/books?category=${category.slug}`}
                  className="mt-7 inline-flex items-center gap-2 border-b border-navy/25 pb-1 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-gold-deep hover:text-gold-deep"
                >
                  Browse {category.name}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
