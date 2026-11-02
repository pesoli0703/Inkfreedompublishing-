import type { Metadata } from "next";
import Link from "next/link";
import { BookCard } from "@/components/book-card";
import { CatalogueSearch, SortSelect } from "@/components/catalogue-controls";
import { EmptyState, Eyebrow } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryCounts, listBooks } from "@/lib/queries";

export const metadata: Metadata = {
  title: "The shelf",
  description: "Every ebook on Inkfreedom — fiction, poetry, essays, memoir and more.",
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { q, category, sort } = await searchParams;
  const sortValue = (sort ?? "newest") as "newest" | "title" | "price-asc" | "price-desc";

  const [books, counts] = await Promise.all([
    listBooks({ q, category, sort: sortValue }),
    getCategoryCounts(),
  ]);

  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const activeCategory = category ?? null;

  function href(next: { category?: string | null }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort && sort !== "newest") params.set("sort", sort);
    const cat = next.category === undefined ? activeCategory : next.category;
    if (cat) params.set("category", cat);
    const query = params.toString();
    return `/books${query ? `?${query}` : ""}`;
  }

  return (
    <>
      <section className="border-b border-line bg-paper-deep">
        <div className="shell pb-10 pt-12 md:pb-14 md:pt-16">
          <Eyebrow>The catalogue</Eyebrow>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h1 className="display-lg text-ink">
              {activeCategory ?? "The shelf"}
            </h1>
            <p className="max-w-sm pb-2 text-[0.85rem] leading-relaxed text-ink-muted">
              {books.length} {books.length === 1 ? "title" : "titles"}
              {q ? ` matching “${q}”` : ""} across PDF and ePub editions, sold directly
              by their authors.
            </p>
          </div>

          <div className="mt-8 max-w-xl">
            <CatalogueSearch initialQuery={q ?? ""} />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="shell flex flex-wrap items-center gap-2 py-4">
          <Link
            href={href({ category: null })}
            className={`chip ${!activeCategory ? "chip-on" : ""}`}
          >
            All titles
            <span className="ml-1 tabular-nums opacity-60">{total}</span>
          </Link>
          {CATEGORIES.map((item) => {
            const count = counts.get(item.name) ?? 0;
            if (count === 0 && activeCategory !== item.name) return null;
            return (
              <Link
                key={item.slug}
                href={href({ category: item.name })}
                className={`chip ${activeCategory === item.name ? "chip-on" : ""}`}
              >
                {item.name}
                <span className="ml-1 tabular-nums opacity-60">{count}</span>
              </Link>
            );
          })}
          <div className="ml-auto hidden sm:block">
            <SortSelect value={sortValue} />
          </div>
        </div>
      </section>

      <section className="shell py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between sm:hidden">
          <SortSelect value={sortValue} />
          <span className="text-[0.75rem] text-ink-muted">{books.length} results</span>
        </div>

        {books.length > 0 ? (
          <div className="stagger grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-7 lg:grid-cols-4">
            {books.map((book, index) => (
              <BookCard key={book.id} book={book} priority={index < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing on this shelf yet"
            body={
              q
                ? `No published titles match “${q}”. Try a broader word, or browse another category.`
                : "This category has no published titles yet. Authors publishing today will appear here."
            }
            action={
              <Link href="/books" className="btn btn-primary">
                Clear filters
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}
