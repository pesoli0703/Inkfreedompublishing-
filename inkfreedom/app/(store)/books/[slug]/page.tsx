import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { BookCover, coverPalette } from "@/components/book-cover";
import { Badge, Eyebrow } from "@/components/ui";
import { getBookBySlug, isInWishlist, listBooks, ownsBook } from "@/lib/queries";
import { getViewer } from "@/lib/auth";
import { startCheckoutAction, toggleWishlistAction } from "@/lib/actions/commerce";
import { formatBytes, formatNaira, readingTime } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Title not found" };

  return {
    title: book.title,
    description: book.description.slice(0, 180),
    openGraph: {
      title: `${book.title} — ${book.author?.name ?? "Inkfreedom"}`,
      description: book.description.slice(0, 180),
    },
  };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const viewer = await getViewer();
  const [owned, wished] = viewer
    ? await Promise.all([ownsBook(viewer.user.id, book.id), isInWishlist(viewer.user.id, book.id)])
    : [false, false];

  const related = (await listBooks({ category: book.category, limit: 5 })).filter(
    (item) => item.id !== book.id,
  ).slice(0, 4);

  const palette = coverPalette(book.category);
  const hours = readingTime(book.pages);

  return (
    <>
      <div className="border-b border-line bg-paper-deep">
        <div className="shell flex items-center gap-2 py-4 text-[0.75rem] text-ink-muted">
          <Link href="/books" className="hover:text-ink">The shelf</Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/books?category=${encodeURIComponent(book.category)}`}
            className="hover:text-ink"
          >
            {book.category}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ink">{book.title}</span>
        </div>
      </div>

      <section className="shell py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* Cover column */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="mx-auto max-w-[22rem]">
              <BookCover
                title={book.title}
                author={book.author?.name}
                category={book.category}
                path={book.cover_path}
                priority
                sizes="(max-width: 1024px) 80vw, 360px"
                className="shadow-lift"
              />
            </div>

            <dl className="mx-auto mt-8 max-w-[22rem] divide-y divide-line border-y border-line text-[0.8rem]">
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">Format</dt>
                <dd className="font-medium text-ink">
                  {book.ebook_format === "epub" ? "ePub" : "PDF"}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">File size</dt>
                <dd className="text-ink">{formatBytes(book.ebook_size_bytes)}</dd>
              </div>
              {book.pages ? (
                <div className="flex items-center justify-between py-3">
                  <dt className="text-ink-muted">Length</dt>
                  <dd className="text-ink">
                    {book.pages} pages{hours ? ` · ${hours}` : ""}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">Language</dt>
                <dd className="text-ink">{book.language}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">Published</dt>
                <dd className="text-ink">
                  {book.published_at
                    ? new Date(book.published_at).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Detail column */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{book.category}</Badge>
              <Badge tone={book.price_kobo === 0 ? "green" : "ink"}>
                {book.price_kobo === 0 ? "Free edition" : "Paid edition"}
              </Badge>
            </div>

            <h1 className="display-lg mt-5 text-ink">{book.title}</h1>
            {book.subtitle ? (
              <p className="italic-display mt-3 text-[1.4rem] leading-tight text-ink-muted">
                {book.subtitle}
              </p>
            ) : null}

            {book.author ? (
              <Link
                href={`/authors/${book.author.slug}`}
                className="group mt-7 inline-flex items-center gap-3"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-full font-display text-[1.05rem]"
                  style={{ backgroundColor: palette.bg, color: palette.ink }}
                >
                  {book.author.name.slice(0, 1)}
                </span>
                <span>
                  <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-ink-muted">
                    Written by
                  </span>
                  <span className="block text-[0.92rem] font-medium text-ink group-hover:text-ember">
                    {book.author.name}
                  </span>
                </span>
              </Link>
            ) : null}

            <div className="mt-9 border-t border-line pt-8">
              <h2 className="label text-ink-muted">About this book</h2>
              <p className="mt-4 whitespace-pre-line text-[0.98rem] leading-[1.75] text-ink-soft">
                {book.description}
              </p>
            </div>

            {/* Buy panel */}
            <div className="mt-10 border border-line bg-paper-card p-6 md:p-7">
              {owned ? (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="label text-ink-muted">In your library</p>
                      <p className="mt-1 font-display text-[1.6rem] leading-none text-ink">
                        You own this edition
                      </p>
                    </div>
                    <Badge tone="green">Purchased</Badge>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href={`/api/download/${book.id}`} className="btn btn-primary flex-1">
                      Download {book.ebook_format === "epub" ? "ePub" : "PDF"}
                    </a>
                    <Link href="/library" className="btn btn-quiet">
                      My library
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="label text-ink-muted">Price</p>
                      <p className="mt-1 font-display text-[2.4rem] leading-none text-ink">
                        {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
                      </p>
                    </div>
                    <p className="max-w-[13rem] text-right text-[0.72rem] leading-relaxed text-ink-muted">
                      One payment. Permanent access. The author keeps 90%.
                    </p>
                  </div>

                  <form action={startCheckoutAction} className="mt-6">
                    <input type="hidden" name="bookId" value={book.id} />
                    <button type="submit" className="btn btn-primary w-full">
                      {book.price_kobo === 0 ? "Add to my library" : "Buy this ebook"}
                      <span aria-hidden="true">→</span>
                    </button>
                  </form>

                  <form action={toggleWishlistAction} className="mt-3">
                    <input type="hidden" name="bookId" value={book.id} />
                    <input type="hidden" name="redirectTo" value={`/books/${book.slug}`} />
                    <button type="submit" className="btn btn-quiet w-full">
                      {wished ? "★ Saved to wishlist" : "☆ Save for later"}
                    </button>
                  </form>

                  {!viewer ? (
                    <p className="mt-3 text-center text-[0.72rem] text-ink-muted">
                      You will be asked to sign in first.
                    </p>
                  ) : null}
                </div>
              )}

              <ul className="mt-6 grid gap-2 border-t border-line-soft pt-5 text-[0.78rem] text-ink-muted">
                <li className="flex items-center gap-2">
                  <Check /> Instant download after checkout
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Read on phone, tablet, laptop or e-reader
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Re-download any time from your library
                </li>
              </ul>
            </div>

            {book.author ? (
              <div className="mt-10 border-t border-line pt-8">
                <h2 className="label text-ink-muted">About the author</h2>
                <p className="mt-3 font-display text-[1.5rem] text-ink">{book.author.name}</p>
                {book.author.tagline ? (
                  <p className="mt-1 text-[0.85rem] text-ink-muted">{book.author.tagline}</p>
                ) : null}
                <Link
                  href={`/authors/${book.author.slug}`}
                  className="mt-4 inline-block text-[0.82rem] font-medium text-ink underline decoration-line underline-offset-4 hover:text-ember"
                >
                  See everything by {book.author.name.split(" ")[0]}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-line bg-paper-deep">
          <div className="shell py-14">
            <div className="flex items-end justify-between">
              <div>
                <Eyebrow>More in {book.category}</Eyebrow>
                <h2 className="display-md mt-3 text-ink">If you liked this</h2>
              </div>
              <Link
                href={`/books?category=${encodeURIComponent(book.category)}`}
                className="hidden text-[0.8rem] font-medium text-ink hover:text-ember sm:block"
              >
                View all →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-7">
              {related.map((item) => (
                <BookCard key={item.id} book={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2.5 7.5 5.5 10.5 11.5 4" stroke="#bf4529" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
