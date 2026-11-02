import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { PageHead, StatusPill } from "@/components/dash";
import { requireAuthor } from "@/lib/auth";
import { getStudioOverview } from "@/lib/studio";
import { formatDate, formatNaira } from "@/lib/format";
import { deleteBookAction, submitForReviewAction } from "@/lib/actions/author";

export const metadata: Metadata = { title: "My editions" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Live" },
  { value: "pending", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "rejected", label: "Needs work" },
];

export default async function StudioBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; submitted?: string; saved?: string; deleted?: string; error?: string }>;
}) {
  const viewer = await requireAuthor();
  const params = await searchParams;
  const { books } = await getStudioOverview(viewer.author.id);
  const filtered = params.status ? books.filter((book) => book.status === params.status) : books;

  const notice = params.submitted
    ? "Submitted for review. An editor will look at it shortly."
    : params.saved
      ? "Saved as a draft."
      : params.deleted
        ? "Edition removed."
        : params.error === "missing-file"
          ? "That edition has no file attached, so it cannot be submitted."
          : null;

  return (
    <div>
      <PageHead
        eyebrow="Catalogue"
        title="My editions"
        description="Everything you have uploaded, with its status in the review queue."
        aside={
          <Link href="/studio/books/new" className="btn btn-primary h-10 px-4 text-[0.78rem]">
            Upload an edition
          </Link>
        }
      />

      {notice ? (
        <div className="mt-6 border border-[#cbd9c1] bg-[#eaf0e4] px-4 py-3 text-[0.82rem] text-[#3f5a33]">
          {notice}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value;
          const count = filter.value
            ? books.filter((book) => book.status === filter.value).length
            : books.length;
          return (
            <Link
              key={filter.label}
              href={filter.value ? `/studio/books?status=${filter.value}` : "/studio/books"}
              className={`chip ${active ? "chip-on" : ""}`}
            >
              {filter.label}
              <span className="ml-1 tabular-nums opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 border border-dashed border-line bg-paper-card px-6 py-14 text-center">
          <p className="font-display text-[1.5rem] text-ink">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.85rem] text-ink-muted">
            No editions match this filter.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {filtered.map((book) => (
            <li key={book.id} className="border border-line bg-paper-card p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Link href={`/studio/books/${book.id}`} className="w-16 shrink-0">
                  <BookCover
                    title={book.title}
                    category={book.category}
                    path={book.cover_path}
                    sizes="64px"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/studio/books/${book.id}`}
                        className="block truncate font-display text-[1.2rem] leading-tight text-ink hover:text-ember"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-1 text-[0.72rem] text-ink-muted">
                        {book.category} · {book.ebook_format === "epub" ? "ePub" : "PDF"}
                        {book.pages ? ` · ${book.pages} pages` : ""} ·{" "}
                        {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
                      </p>
                    </div>
                    <StatusPill status={book.status} />
                  </div>

                  <p className="mt-2 text-[0.72rem] text-ink-muted">
                    {book.status === "published" && book.published_at
                      ? `Published ${formatDate(book.published_at)}`
                      : book.status === "pending"
                        ? `Submitted ${formatDate(book.submitted_at)}`
                        : `Updated ${formatDate(book.updated_at)}`}
                  </p>

                  {book.status === "rejected" && book.review_note ? (
                    <div className="mt-3 border-l-2 border-ember bg-ember/5 px-3 py-2">
                      <p className="label text-ember-deep">Editor&apos;s note</p>
                      <p className="mt-1 text-[0.78rem] leading-relaxed text-ember-deep">
                        {book.review_note}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/studio/books/${book.id}`}
                      className="btn btn-quiet h-9 px-3.5 text-[0.75rem]"
                    >
                      Edit listing
                    </Link>

                    {book.status === "published" ? (
                      <Link
                        href={`/books/${book.slug}`}
                        className="btn btn-quiet h-9 px-3.5 text-[0.75rem]"
                      >
                        View in store
                      </Link>
                    ) : null}

                    {book.status !== "published" && book.status !== "pending" ? (
                      <form action={submitForReviewAction}>
                        <input type="hidden" name="bookId" value={book.id} />
                        <button type="submit" className="btn btn-primary h-9 px-3.5 text-[0.75rem]">
                          Submit for review
                        </button>
                      </form>
                    ) : null}

                    {book.status === "draft" || book.status === "rejected" ? (
                      <form action={deleteBookAction}>
                        <input type="hidden" name="bookId" value={book.id} />
                        <button
                          type="submit"
                          className="text-[0.75rem] text-ink-muted transition-colors hover:text-ember"
                        >
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
