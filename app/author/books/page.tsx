import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { authorNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AuthorBooksPage() {
  await requireViewer("/author/books");
  const supabase = await createServerSupabaseClient();

  const { data: books } = supabase
    ? await supabase
        .from("books")
        .select("id, title, status, submitted_at, reviewed_at, review_note, published_at, updated_at")
        .order("updated_at", { ascending: false })
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Author"
      title="My books"
      description="Drafts stay private until an administrator approves them. Only approved titles can be published, and every status change is recorded in the audit trail."
      sections={authorNav()}
      aside={
        <Link
          href="/author/books/new"
          className="bg-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft"
        >
          New book
        </Link>
      }
    >
      <Panel title={`${books?.length ?? 0} titles`}>
        {(!books || books.length === 0) ? (
          <Empty title="No books yet">
            Start a draft. You can add the manuscript, cover and NGN price before
            submitting it for review.
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {books.map((book) => (
              <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link href={`/author/books/${book.id}`} className="text-[0.95rem] text-navy hover:underline">
                    {book.title}
                  </Link>
                  <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                    {formatLabel(book.status)}
                    {book.submitted_at ? ` · submitted ${formatDate(book.submitted_at)}` : ""}
                    {book.published_at ? ` · published ${formatDate(book.published_at)}` : ""}
                  </p>
                  {book.review_note && (
                    <p className="mt-1 text-[0.75rem] text-gold-deep">Editor: {book.review_note}</p>
                  )}
                </div>
                <Link
                  href={`/author/books/${book.id}`}
                  className="text-[0.7rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DashboardShell>
  );
}
