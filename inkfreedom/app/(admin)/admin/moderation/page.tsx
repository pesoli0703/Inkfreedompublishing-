import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { PageHead } from "@/components/dash";
import { listAdminBooks } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { approveBookAction, rejectBookAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Review queue" };

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  const params = await searchParams;
  const books = await listAdminBooks("pending");

  const notice = params.approved
    ? "Listing published to the storefront."
    : params.rejected
      ? "Listing returned to the author with a note."
      : null;

  return (
    <div>
      <PageHead
        eyebrow="Editorial"
        title="Review queue"
        description="Read the listing, check the file and the cover, then publish or return it with a reason."
      />

      {notice ? (
        <div className="mt-6 border border-[#cbd9c1] bg-[#eaf0e4] px-4 py-3 text-[0.82rem] text-[#3f5a33]">
          {notice}
        </div>
      ) : null}

      {books.length === 0 ? (
        <div className="mt-8 border border-dashed border-line bg-paper-card px-6 py-16 text-center">
          <p className="font-display text-[1.6rem] text-ink">Nothing waiting</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.85rem] text-ink-muted">
            Every submitted listing has been reviewed. New submissions appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {books.map((book) => (
            <article key={book.id} className="border border-line bg-paper-card">
              <div className="flex flex-col gap-5 p-5 md:flex-row">
                <div className="w-24 shrink-0 md:w-28">
                  <BookCover
                    title={book.title}
                    author={book.author?.name}
                    category={book.category}
                    path={book.cover_path}
                    sizes="112px"
                    className="shadow-shelf"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-[1.5rem] leading-tight text-ink">
                        {book.title}
                      </h2>
                      <p className="mt-1 text-[0.8rem] text-ink-muted">
                        {book.author?.name ?? "Unknown author"} · {book.category} ·{" "}
                        {book.ebook_format === "epub" ? "ePub" : "PDF"}
                        {book.pages ? ` · ${book.pages} pages` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[1.4rem] leading-none text-ink">
                        {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-ink-muted">
                        Submitted {formatDate(book.submitted_at)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 max-w-3xl text-[0.85rem] leading-relaxed text-ink-soft line-clamp-4">
                    {book.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.72rem]">
                    <a
                      href={book.ebook_path ? `/api/download/${book.id}` : "#"}
                      className="font-medium text-ink underline decoration-line underline-offset-4 hover:text-ember"
                    >
                      Open the file
                    </a>
                    {book.author?.slug ? (
                      <Link
                        href={`/authors/${book.author.slug}`}
                        className="text-ink-muted hover:text-ink"
                      >
                        Author page
                      </Link>
                    ) : null}
                    <span className="font-mono text-[0.66rem] text-ink-muted">
                      {book.slug}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-line p-5 md:grid-cols-2">
                <form action={approveBookAction}>
                  <input type="hidden" name="bookId" value={book.id} />
                  <button type="submit" className="btn btn-primary w-full">
                    Publish to the storefront
                  </button>
                  <p className="mt-2 text-center text-[0.68rem] text-ink-muted">
                    Goes live immediately and appears in the shelf and the sitemap.
                  </p>
                </form>

                <form action={rejectBookAction} className="flex flex-col gap-2">
                  <input type="hidden" name="bookId" value={book.id} />
                  <input
                    name="note"
                    required
                    placeholder="What needs to change? The author sees this."
                    className="field h-11 text-[0.82rem]"
                  />
                  <button type="submit" className="btn btn-quiet w-full">
                    Return with a note
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
