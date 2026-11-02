import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/book-cover";
import { BookGrid } from "@/components/book-card";
import { BookPurchase } from "@/components/book-purchase";
import { SectionHeading } from "@/components/section-heading";
import {
  authorName,
  categoryName,
  getBook,
  relatedBooks,
} from "@/lib/catalogue";
import { getAuthor } from "@/lib/data/authors";
import { formatPrice } from "@/lib/format";
import { loadLiveBook, loadLiveCatalogue } from "@/lib/catalogue-live";

type Params = { slug: string };

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = (await loadLiveBook(slug)) ?? getBook(slug);
  if (!book) return { title: "Book not found" };

  return {
    title: book.title,
    description: `${book.hook} ${categoryName(book.category)} · ${authorName(book.authorSlug)}.`,
    openGraph: {
      title: `${book.title} — ${authorName(book.authorSlug)}`,
      description: book.hook,
    },
  };
}

export default async function BookPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  // Published titles are read from Supabase first; the static preview dataset
  // only answers when the live catalogue has no such slug.
  const live = await loadLiveBook(slug);
  const book = live ?? getBook(slug);
  if (!book) notFound();

  const author = getAuthor(book.authorSlug);
  const related = live
    ? (await loadLiveCatalogue())
        .filter((entry) => entry.slug !== live.slug)
        .sort(
          (a, b) =>
            Number(b.category === live.category) - Number(a.category === live.category),
        )
        .slice(0, 3)
    : relatedBooks(book);

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-editorial py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <Link href="/books" className="transition-colors hover:text-navy">
              Books
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <Link
              href={`/books?category=${book.category}`}
              className="transition-colors hover:text-navy"
            >
              {categoryName(book.category)}
            </Link>
          </nav>

          <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Cover */}
            <div className="lg:col-span-4">
              <div className="mx-auto max-w-[19rem] lg:sticky lg:top-28 lg:max-w-none">
                <BookCover book={book} priority />
                <p className="mt-4 text-center text-[0.68rem] leading-relaxed tracking-[0.1em] text-charcoal-soft uppercase">
                  Sample cover design
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-8">
              <p className="eyebrow text-gold-deep">{categoryName(book.category)}</p>
              <h1 className="mt-4 font-display text-3xl leading-[1.06] text-navy sm:text-4xl lg:text-[2.9rem]">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="mt-2 font-display text-lg text-charcoal-soft italic">
                  {book.subtitle}
                </p>
              ) : null}

              <p className="mt-5 text-[0.95rem] text-charcoal-soft">
                by{" "}
                <Link
                  href={`/authors/${book.authorSlug}`}
                  className="border-b border-gold/60 pb-0.5 font-medium text-navy transition-colors hover:border-navy"
                >
                  {authorName(book.authorSlug)}
                </Link>
                {author ? <> · {author.based}</> : null}
              </p>

              <p className="mt-6 max-w-xl border-l-2 border-gold/50 pl-5 font-display text-lg leading-relaxed text-charcoal">
                {book.hook}
              </p>

              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div>
                  <h2 className="eyebrow text-charcoal-soft">About this book</h2>
                  <div className="mt-4 space-y-4 text-[0.92rem] leading-relaxed text-charcoal-soft">
                    {book.description.map((paragraph) => (
                      <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                    ))}
                  </div>

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {book.themes.map((theme) => (
                      <li
                        key={theme}
                        className="border border-line px-2.5 py-1 text-[0.68rem] tracking-[0.08em] text-charcoal-soft uppercase"
                      >
                        {theme}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <BookPurchase slug={book.slug} book={book} />
                </div>
              </div>

              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                    Pages
                  </dt>
                  <dd className="mt-1 text-charcoal">{book.pages}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                    Language
                  </dt>
                  <dd className="mt-1 text-charcoal">{book.languages}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                    Publisher
                  </dt>
                  <dd className="mt-1 text-charcoal">INKFREEDOMPUBLISHING</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                    From
                  </dt>
                  <dd className="mt-1 text-charcoal">{formatPrice(book.price)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Preview area */}
      <section className="container-editorial py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading
              eyebrow="Read a preview"
              title="Inside the book"
              description="A short sample passage. In the live catalogue this area will hold a proper multi-page preview reader."
            />
            <p className="mt-6 border border-line bg-white p-4 text-[0.78rem] leading-relaxed text-charcoal-soft">
              Preview text is fictional sample material created for this build.
              Copyright of the finished preview will sit with the author.
            </p>
          </div>

          <div className="lg:col-span-8">
            <article className="relative border border-line bg-[#fdfcf8] px-6 py-10 shadow-[0_18px_40px_-32px_rgba(16,28,50,0.6)] sm:px-14 sm:py-14">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-3 w-px bg-gold/25 sm:left-7"
              />
              <p className="eyebrow text-gold-deep">{book.excerpt.label}</p>
              <div className="mt-6 space-y-5 font-display text-[1.02rem] leading-[1.85] text-charcoal sm:text-[1.12rem]">
                {book.excerpt.body.map((paragraph, index) => (
                  <p key={paragraph.slice(0, 24)}>
                    {index === 0 ? (
                      <span className="float-left mt-1.5 mr-2 font-display text-[3.1rem] leading-[0.78] text-navy">
                        {paragraph.charAt(0)}
                      </span>
                    ) : null}
                    {index === 0 ? paragraph.slice(1) : paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
                <p className="text-[0.68rem] tracking-[0.14em] text-charcoal-soft uppercase">
                  Sample · {book.title}
                </p>
                <p className="text-[0.68rem] tracking-[0.14em] text-charcoal-soft uppercase">
                  Page 1
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="border-t border-line bg-ivory-deep/60">
        <div className="container-editorial py-16 sm:py-20">
          <SectionHeading
            eyebrow="You may also like"
            title="Elsewhere on the shelf"
            action={{ href: "/books", label: "All books" }}
          />
          <BookGrid books={related} className="mt-10" />
        </div>
      </section>
    </>
  );
}
