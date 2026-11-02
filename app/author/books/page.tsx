import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

/**
 * The status buckets an author cares about. "Pending" is a submitted book
 * waiting on an editor; "Rejected" is a decision, not a deletion — the author
 * can fix it and resubmit.
 */
const FILTERS: Record<
  string,
  { label: string; match: readonly string[] | null }
> = {
  all: { label: "All eBooks", match: null },
  draft: { label: "Drafts", match: ["draft"] },
  submitted: { label: "Pending approval", match: ["submitted"] },
  changes_requested: { label: "Changes requested", match: ["changes_requested"] },
  published: { label: "Published", match: ["published", "approved"] },
  rejected: { label: "Rejected", match: ["rejected"] },
  archived: { label: "Unpublished / archived", match: ["unpublished", "archived"] },
};

type FilterKey = keyof typeof FILTERS;

export default async function AuthorBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const viewer = await requireAuthorArea("/author/books");
  const { status } = await searchParams;
  const active: FilterKey = (status && status in FILTERS ? status : "all") as FilterKey;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/author");

  const { data: author } = await supabase
    .from("author_profiles")
    .select("id")
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (!author) redirect("/author/start");

  const { data: books } = await supabase
    .from("books")
    .select("id, book_code, title, status, submitted_at, reviewed_at, review_note, published_at, updated_at, cover_path")
    .order("updated_at", { ascending: false });

  const rows = books ?? [];
  const counts = Object.fromEntries(
    (Object.keys(FILTERS) as FilterKey[]).map((key) => {
      const match = FILTERS[key].match;
      return [key, match ? rows.filter((book) => match.includes(String(book.status))).length : rows.length];
    }),
  ) as Record<FilterKey, number>;

  const match = FILTERS[active].match;
  const visible = match ? rows.filter((book) => match.includes(String(book.status))) : rows;

  return (
    <DashboardShell
      eyebrow="Author"
      title="My eBooks"
      description="Everything you have uploaded, and where each one stands."
      sections={authorNav({ review: counts.submitted, changes: counts.changes_requested })}
      aside={
        <Link
          href="/author/books/new"
          className="bg-navy px-5 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft"
        >
          + Upload new eBook
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTERS) as FilterKey[]).map((key) => {
            const isActive = key === active;
            return (
              <Link
                key={key}
                href={key === "all" ? "/author/books" : `/author/books?status=${key}`}
                aria-current={isActive ? "page" : undefined}
                className={`border px-3.5 py-2 text-[0.68rem] font-medium tracking-[0.1em] uppercase transition-colors ${
                  isActive
                    ? "border-navy bg-navy text-ivory"
                    : "border-line bg-white text-charcoal-soft hover:border-navy/40 hover:text-navy"
                }`}
              >
                {FILTERS[key].label} ({counts[key]})
              </Link>
            );
          })}
        </div>

        <Panel title={`${visible.length} ${visible.length === 1 ? "eBook" : "eBooks"}`}>
          {visible.length === 0 ? (
            <Empty title={active === "all" ? "No eBooks yet" : "Nothing in this list"}>
              {active === "all" ? (
                <>
                  Upload a PDF or EPUB with a cover and a price.{" "}
                  <Link href="/author/books/new" className="text-navy underline">
                    Upload your first eBook
                  </Link>
                  .
                </>
              ) : (
                "Try another status, or upload a new eBook."
              )}
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((book) => {
                const cover = book.cover_path
                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-covers/${book.cover_path}`
                  : null;
                return (
                  <li key={book.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                    <div className="flex gap-4">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" className="h-24 w-16 border border-line object-cover" />
                      ) : (
                        <div className="flex h-24 w-16 items-center justify-center border border-dashed border-line text-[0.6rem] text-charcoal-soft">
                          No cover
                        </div>
                      )}
                      <div>
                        <Link href={`/author/books/${book.id}`} className="text-[0.95rem] text-navy hover:underline">
                          {book.title}
                        </Link>
                        <p className="mt-1 font-mono text-[0.7rem] tracking-[0.04em] text-charcoal-soft">
                          {book.book_code ?? "Pending"}
                        </p>
                        <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                          {formatLabel(book.status)}
                          {book.submitted_at ? ` · submitted ${formatDate(book.submitted_at)}` : ""}
                          {book.published_at ? ` · published ${formatDate(book.published_at)}` : ""}
                        </p>
                        {book.review_note && (
                          <p className="mt-1 max-w-md text-[0.75rem] leading-relaxed text-gold-deep">
                            Editor: {book.review_note}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/author/books/${book.id}`}
                      className="text-[0.7rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep"
                    >
                      Manage
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
