import type { Metadata } from "next";
import Link from "next/link";
import { BookGrid } from "@/components/book-card";
import { SearchBar } from "@/components/search-bar";
import { SortSelect } from "@/components/sort-select";
import {
  browseBooks,
  sortOptions,
  type SortKey,
} from "@/lib/catalogue";
import { loadCategories, loadLiveCatalogue } from "@/lib/catalogue-live";
import { groupCategoriesBySection, sectionForSlug } from "@/lib/category-sections";

export const metadata: Metadata = {
  title: "Discover Books",
  description:
    "Browse the INKFREEDOMPUBLISHING catalogue by category, author or price.",
};

export const revalidate = 300;

type BooksSearchParams = {
  q?: string;
  category?: string;
  sort?: string;
};

const readParam = (value: string | undefined) =>
  typeof value === "string" ? value : "";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<BooksSearchParams>;
}) {
  const params = await searchParams;
  const q = readParam(params.q);
  const category = readParam(params.category);
  const sortParam = readParam(params.sort);
  const sort = sortOptions.some((option) => option.value === sortParam)
    ? (sortParam as SortKey)
    : "curated";

  const [catalogue, categories] = await Promise.all([
    loadLiveCatalogue(),
    loadCategories(),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);
  const activeSection = activeCategory
    ? sectionForSlug(activeCategory.section)
    : undefined;
  const groups = groupCategoriesBySection(categories);
  const results = browseBooks(catalogue, {
    q,
    category: activeCategory?.slug,
    sort,
  });
  const total = catalogue.length;

  const chipHref = (nextCategory?: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextCategory) query.set("category", nextCategory);
    if (sort !== "curated") query.set("sort", sort);
    const suffix = query.toString();
    return suffix ? `/books?${suffix}` : "/books";
  };

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
            <span className="text-navy">Books</span>
            {activeSection ? (
              <>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
                <Link
                  href={`/categories#${activeSection.slug}`}
                  className="transition-colors hover:text-navy"
                >
                  {activeSection.name}
                </Link>
              </>
            ) : null}
            {activeCategory ? (
              <>
                <span aria-hidden="true" className="mx-2">
                  /
                </span>
                <span className="text-navy">{activeCategory.name}</span>
              </>
            ) : null}
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">The catalogue</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
                {activeCategory ? activeCategory.name : "Discover books"}
              </h1>
              <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-charcoal-soft">
                {activeCategory
                  ? activeCategory.blurb
                  : "Independent titles across every shelf — fiction, non-fiction, business, poetry and drama, children’s books and academic texts."}
              </p>
              <p className="mt-4 inline-flex border border-line bg-white px-3 py-1.5 text-[0.66rem] font-medium tracking-[0.12em] text-charcoal-soft uppercase">
                {total === 0
                  ? "No titles published yet"
                  : `Live catalogue — ${total} published ${total === 1 ? "title" : "titles"}`}
              </p>
            </div>
            <div className="lg:col-span-5">
              <SearchBar initialQuery={q} />
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-10 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip href={chipHref()} active={!activeCategory}>
              All books
            </FilterChip>
            {activeCategory ? (
              <FilterChip href={chipHref(activeCategory.slug)} active>
                {activeCategory.name}
              </FilterChip>
            ) : null}
          </div>
          <SortSelect value={sort} />
        </div>

        {groups.length > 0 ? (
          <details className="group border-b border-line py-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.7rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase transition-colors hover:text-navy [&::-webkit-details-marker]:hidden">
              <span className="inline-block transition-transform duration-200 group-open:rotate-90">
                ›
              </span>
              Browse all {categories.length} shelves
            </summary>

            <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div key={group.section.slug}>
                  <p className="text-[0.66rem] font-semibold tracking-[0.16em] text-gold-deep uppercase">
                    {group.section.name}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {group.categories.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={chipHref(item.slug)}
                          aria-current={
                            activeCategory?.slug === item.slug ? "page" : undefined
                          }
                          className={`text-[0.85rem] transition-colors ${
                            activeCategory?.slug === item.slug
                              ? "font-semibold text-navy"
                              : "text-charcoal-soft hover:text-navy"
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-[0.8rem] text-charcoal-soft">
            <span className="font-semibold text-navy">{results.length}</span>{" "}
            {results.length === 1 ? "title" : "titles"}
            {q ? (
              <>
                {" "}
                matching{" "}
                <span className="font-medium text-navy">&ldquo;{q}&rdquo;</span>
              </>
            ) : null}
            {activeCategory ? <> in {activeCategory.name}</> : null}
          </p>
          {q || activeCategory || sort !== "curated" ? (
            <Link
              href="/books"
              className="text-[0.7rem] font-semibold tracking-[0.14em] text-gold-deep uppercase hover:text-navy"
            >
              Clear filters
            </Link>
          ) : null}
        </div>

        {results.length > 0 ? (
          <BookGrid books={results} className="mt-10" />
        ) : (
          <div className="mt-10 border border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-2xl text-navy">No titles found</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-soft">
              {total === 0 ? (
                "The catalogue is empty right now. Titles appear here as soon as they are published."
              ) : q ? (
                <>
                  Nothing in the catalogue matches{" "}
                  <span className="font-medium text-navy">“{q}”</span>. Try a
                  different title, author or theme.
                </>
              ) : (
                "Nothing matches those filters. Try a different shelf, or browse the full list."
              )}
            </p>
            <Link
              href={total === 0 ? "/publish" : "/books"}
              className="mt-7 inline-flex bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
            >
              {total === 0 ? "Publish with us" : "View all books"}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 snap-start border px-4 py-2.5 text-[0.7rem] font-medium tracking-[0.1em] whitespace-nowrap uppercase transition-colors ${
        active
          ? "border-navy bg-navy text-ivory"
          : "border-line bg-white text-charcoal-soft hover:border-navy/40 hover:text-navy"
      }`}
    >
      {children}
    </Link>
  );
}
