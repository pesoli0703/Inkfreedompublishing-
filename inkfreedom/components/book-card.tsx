import Link from "next/link";
import { BookCover } from "./book-cover";
import { formatNaira } from "@/lib/format";
import type { BookWithAuthor } from "@/lib/types";

export function BookCard({
  book,
  priority = false,
  showPrice = true,
}: {
  book: BookWithAuthor;
  priority?: boolean;
  showPrice?: boolean;
}) {
  return (
    <article className="group relative">
      <Link href={`/books/${book.slug}`} className="block focus-visible:outline-none">
        <div className="relative [perspective:1200px]">
          <div className="relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 [transform-style:preserve-3d]">
            <BookCover
              title={book.title}
              author={book.author?.name}
              category={book.category}
              path={book.cover_path}
              priority={priority}
              className="shadow-shelf transition-shadow duration-500 group-hover:shadow-lift"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/10"
            />
          </div>
          <span className="sr-only">{book.category}</span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[1.3rem] leading-tight text-ink transition-colors group-hover:text-ember">
              {book.title}
            </h3>
            <p className="mt-1 truncate text-[0.8rem] text-ink-muted">
              {book.author?.name ?? "Inkfreedom"}
            </p>
          </div>
          {showPrice ? (
            <p className="shrink-0 pt-1 text-[0.8rem] font-medium tabular-nums text-ink">
              {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

export function BookRow({ book }: { book: BookWithAuthor }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group flex items-start gap-4 border-b border-line-soft py-4 last:border-0"
    >
      <div className="w-14 shrink-0">
        <BookCover
          title={book.title}
          author={book.author?.name}
          category={book.category}
          path={book.cover_path}
          sizes="56px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[1.1rem] leading-tight text-ink group-hover:text-ember">
          {book.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{book.author?.name}</p>
      </div>
      <p className="shrink-0 text-xs font-medium tabular-nums text-ink">
        {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
      </p>
    </Link>
  );
}
