import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { BookCover } from "@/components/book-cover";
import { Badge, EmptyState } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getLibrary } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My library" };

type LibraryEntry = {
  id: string;
  created_at: string;
  book: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    cover_path: string | null;
    ebook_format: string;
    pages: number | null;
    ebook_size_bytes: number | null;
    author: { name: string; slug: string } | null;
  } | null;
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const viewer = await requireViewer("/library");
  const { welcome } = await searchParams;
  const entries = (await getLibrary(viewer.user.id)) as unknown as LibraryEntry[];
  const owned = entries.filter((entry) => entry.book);

  return (
    <AccountShell
      eyebrow="Your account"
      title="My library"
      description="Every edition you have bought, kept permanently. Download again whenever you need it."
      aside={
        <div className="text-right">
          <p className="font-display text-[2rem] leading-none text-ink">{owned.length}</p>
          <p className="label mt-1 text-ink-muted">Editions owned</p>
        </div>
      }
    >
      {welcome ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-[#cbd9c1] bg-[#eaf0e4] px-5 py-4">
          <div>
            <p className="text-[0.85rem] font-medium text-[#3f5a33]">Purchase complete</p>
            <p className="mt-0.5 text-[0.8rem] text-[#4d6b40]">
              The edition is now in your library — download it below.
            </p>
          </div>
          <Badge tone="green">Added to library</Badge>
        </div>
      ) : null}

      {owned.length === 0 ? (
        <EmptyState
          title="Your shelves are empty"
          body="Buy an ebook from the store and it appears here immediately, ready to download in PDF or ePub."
          action={
            <Link href="/books" className="btn btn-primary">
              Browse the shelf
            </Link>
          }
        />
      ) : (
        <div className="space-y-0">
          {owned.map((entry, index) => {
            const book = entry.book!;
            return (
              <article
                key={entry.id}
                className={`flex flex-col gap-5 py-6 sm:flex-row sm:items-start ${
                  index === 0 ? "" : "border-t border-line"
                }`}
              >
                <Link href={`/books/${book.slug}`} className="w-20 shrink-0 sm:w-24">
                  <BookCover
                    title={book.title}
                    author={book.author?.name}
                    category="Fiction"
                    path={book.cover_path}
                    sizes="96px"
                    className="shadow-shelf"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/books/${book.slug}`}
                        className="font-display text-[1.35rem] leading-tight text-ink hover:text-ember"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-1 text-[0.8rem] text-ink-muted">
                        {book.author?.name}
                        {book.pages ? ` · ${book.pages} pages` : ""} ·{" "}
                        {formatBytes(book.ebook_size_bytes)}
                      </p>
                    </div>
                    <Badge tone="neutral">
                      {book.ebook_format === "epub" ? "ePub" : "PDF"}
                    </Badge>
                  </div>

                  <p className="mt-2 text-[0.72rem] text-ink-muted">
                    Added {formatDate(entry.created_at)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={`/api/download/${book.id}`} className="btn btn-primary h-10 px-4 text-[0.78rem]">
                      Download
                    </a>
                    <Link
                      href={`/books/${book.slug}`}
                      className="btn btn-quiet h-10 px-4 text-[0.78rem]"
                    >
                      Book page
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
