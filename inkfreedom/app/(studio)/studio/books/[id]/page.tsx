import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, PageHead, StatusPill } from "@/components/dash";
import { EditionForm } from "@/components/studio-edition-form";
import { requireAuthor } from "@/lib/auth";
import { getStudioBook } from "@/lib/studio";
import { formatDate } from "@/lib/format";
import { submitForReviewAction } from "@/lib/actions/author";

export const metadata: Metadata = { title: "Edit edition" };

export default async function EditEditionPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAuthor();
  const { id } = await params;
  const book = await getStudioBook(id, viewer.author.id);

  if (!book) notFound();

  return (
    <div>
      <Crumbs
        items={[
          { href: "/studio", label: "Studio" },
          { href: "/studio/books", label: "Editions" },
          { label: book.title },
        ]}
      />

      <PageHead
        eyebrow="Edit listing"
        title={book.title}
        description={`Updated ${formatDate(book.updated_at)}.`}
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={book.status} />
            {book.status === "published" ? (
              <Link href={`/books/${book.slug}`} className="btn btn-quiet h-9 px-3.5 text-[0.75rem]">
                View in store
              </Link>
            ) : null}
            {book.status === "draft" || book.status === "rejected" ? (
              <form action={submitForReviewAction}>
                <input type="hidden" name="bookId" value={book.id} />
                <button type="submit" className="btn btn-primary h-9 px-3.5 text-[0.75rem]">
                  Submit for review
                </button>
              </form>
            ) : null}
          </div>
        }
      />

      {book.status === "rejected" && book.review_note ? (
        <div className="mt-6 border-l-2 border-ember bg-ember/5 px-4 py-3">
          <p className="label text-ember-deep">Editor&apos;s note</p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-ember-deep">{book.review_note}</p>
        </div>
      ) : null}

      <p className="mt-4 text-[0.78rem] text-ink-muted">
        Stored file:{" "}
        <span className="font-mono text-[0.72rem] text-ink-soft">
          {book.ebook_path ? book.ebook_path.split("/").pop() : "no file attached"}
        </span>
      </p>

      <div className="mt-8">
        <EditionForm book={book} userId={viewer.user.id} />
      </div>
    </div>
  );
}
