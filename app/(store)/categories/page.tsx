import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { loadCategories, loadLiveCatalogue } from "@/lib/catalogue-live";
import { groupCategoriesBySection } from "@/lib/category-sections";

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Every shelf in the INKFREEDOMPUBLISHING catalogue — fiction, non-fiction, business, poetry and drama, children and young adult, textbooks and academic.",
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const [counts, catalogue] = await Promise.all([
    loadCategories(),
    loadLiveCatalogue(),
  ]);

  const groups = groupCategoriesBySection(counts);

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
            {counts.length} shelves in {groups.length} sections. Every title is
            filed on one of them, so this page is the map of the whole list —
            from crime novels to statistics textbooks.
          </p>

          {groups.length > 1 ? (
            <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2">
              {groups.map((group) => (
                <a
                  key={group.section.slug}
                  href={`#${group.section.slug}`}
                  className="border border-line bg-white px-3.5 py-2 text-[0.68rem] font-medium tracking-[0.1em] text-charcoal-soft uppercase transition-colors hover:border-navy/40 hover:text-navy"
                >
                  {group.section.name}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="container-editorial py-14 sm:py-20">
          <div className="border border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-2xl text-navy">Shelves are loading</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-soft">
              The catalogue could not be read just now. Try again in a moment.
            </p>
          </div>
        </section>
      ) : (
        groups.map((group, index) => (
          <section
            key={group.section.slug}
            id={group.section.slug}
            className={`scroll-mt-24 ${index % 2 === 1 ? "border-y border-line bg-ivory-deep/60" : ""}`}
          >
            <div className="container-editorial py-12 sm:py-16">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                <div>
                  <h2 className="font-display text-3xl leading-tight text-navy sm:text-4xl">
                    {group.section.name}
                  </h2>
                  <p className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-charcoal-soft">
                    {group.section.blurb}
                  </p>
                </div>
                <p className="text-[0.66rem] tracking-[0.16em] text-charcoal-soft uppercase">
                  {group.categories.length}{" "}
                  {group.categories.length === 1 ? "shelf" : "shelves"} ·{" "}
                  {group.count === 0
                    ? "no titles yet"
                    : `${group.count} ${group.count === 1 ? "title" : "titles"}`}
                </p>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.categories.map((category) => {
                  const previews = catalogue
                    .filter((book) => book.category === category.slug)
                    .slice(0, 3);

                  return (
                    <article
                      key={category.slug}
                      className="group relative flex flex-col border border-line bg-white p-6 transition-colors duration-300 hover:border-gold/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-xl leading-tight text-navy">
                            {category.name}
                          </h3>
                          <p className="mt-2 text-[0.66rem] tracking-[0.14em] text-charcoal-soft uppercase">
                            {category.note} ·{" "}
                            {category.count === 0
                              ? "no titles yet"
                              : `${category.count} ${category.count === 1 ? "title" : "titles"}`}
                          </p>
                        </div>

                        {previews.length > 0 ? (
                          <div className="flex -space-x-4">
                            {previews.map((book) => (
                              <div key={book.slug} className="w-9">
                                <BookCover book={book} decorative />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <p className="mt-4 flex-1 text-[0.88rem] leading-relaxed text-charcoal-soft">
                        {category.blurb}
                      </p>

                      <Link
                        href={`/books?category=${category.slug}`}
                        className="mt-5 inline-flex items-center gap-2 border-b border-navy/25 pb-1 text-[0.68rem] font-semibold tracking-[0.16em] text-navy uppercase transition-colors hover:border-gold-deep hover:text-gold-deep"
                      >
                        Browse
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
            </div>
          </section>
        ))
      )}
    </>
  );
}
