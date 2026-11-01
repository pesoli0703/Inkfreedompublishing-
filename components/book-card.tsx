import Link from "next/link";
import { authorName, categoryName } from "@/lib/catalogue";
import type { Book } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { BookCover } from "./book-cover";

export function BookCard({
  book,
  className = "",
}: {
  book: Book;
  className?: string;
}) {
  return (
    <article className={`group relative flex flex-col ${className}`}>
      <Link
        href={`/books/${book.slug}`}
        className="block focus-visible:outline-offset-4"
        aria-label={`${book.title} by ${authorName(book.authorSlug)}`}
      >
        <div className="relative overflow-hidden rounded-[2px]">
          <BookCover
            book={book}
            decorative
            className="transition-transform duration-700 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.018]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-navy/0 transition-colors duration-500 group-hover:bg-navy/10"
          />
        </div>

        <div className="mt-5 flex flex-col gap-1.5">
          <p className="eyebrow text-gold-deep">{categoryName(book.category)}</p>
          <h3 className="font-display text-xl leading-snug text-navy transition-colors group-hover:text-gold-deep">
            {book.title}
          </h3>
          <p className="text-sm text-charcoal-soft">{authorName(book.authorSlug)}</p>
          <div className="mt-2 flex items-baseline gap-3 border-t border-line pt-3">
            <span className="text-sm font-semibold text-navy">
              {formatPrice(book.price)}
            </span>
            <span className="text-[0.68rem] tracking-[0.12em] text-charcoal-soft uppercase">
              from
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function BookGrid({
  books,
  className = "",
}: {
  books: Book[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {books.map((book) => (
        <BookCard key={book.slug} book={book} />
      ))}
    </div>
  );
}
