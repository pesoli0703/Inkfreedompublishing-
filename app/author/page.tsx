import Link from "next/link";
import { DashboardShell, Empty, NotConfigured, Panel, StatGrid } from "@/components/dashboard-shell";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";

type Stats = {
  books_total: number;
  books_published: number;
  books_in_review: number;
  books_changes_requested: number;
  sales_count: number;
  earnings: { currency: string; pending_minor: number; available_minor: number; lifetime_minor: number; paid_minor: number }[];
  withdrawals_open: number;
};

export default async function AuthorDashboard() {
  const viewer = await requireAuthorArea("/author");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Author" title="Author dashboard" sections={authorNav()}>
        <NotConfigured what="Your author workspace" />
      </DashboardShell>
    );
  }

  const [{ data: author }, { data: stats }, { data: recentBooks }] = await Promise.all([
    supabase.from("author_profiles").select("id, pen_name, slug, status, bio, avatar_path").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("author_stats"),
    supabase
      .from("books")
      .select("id, title, status, submitted_at, review_note")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!author) {
    return (
      <DashboardShell eyebrow="Author" title="Author dashboard" sections={authorNav()}>
        <Panel tone="warning">
          <p className="eyebrow text-charcoal-soft">Publishing is not set up yet</p>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-charcoal">
            Choose a pen name and your workspace opens straight away. There is no
            application to wait on — every book you create is reviewed by an
            administrator before it goes on sale.
          </p>
          <Link
            href="/author/start"
            className="mt-6 inline-block bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft"
          >
            Become an author
          </Link>
        </Panel>
      </DashboardShell>
    );
  }

  const typed = (stats ?? null) as Stats | null;
  const earnings = typed?.earnings?.[0];

  return (
    <DashboardShell
      eyebrow="Author"
      title={author.pen_name}
      description="Your books, their review status and what you have earned. Figures come from the ledger, not from estimates."
      sections={authorNav({
        review: typed?.books_in_review,
        changes: typed?.books_changes_requested,
      })}
      aside={
        <Link
          href="/author/books/new"
          className="bg-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft"
        >
          New book
        </Link>
      }
    >
      <div className="space-y-8">
        <StatGrid
          stats={[
            { label: "Published", value: String(typed?.books_published ?? 0) },
            { label: "In review", value: String(typed?.books_in_review ?? 0), note: "Waiting on an editor" },
            { label: "Copies sold", value: String(typed?.sales_count ?? 0) },
            {
              label: "Available to withdraw",
              value: earnings ? formatMoney(earnings.available_minor, earnings.currency) : formatMoney(0),
              note: "After the reserve hold",
            },
            {
              label: "Held in reserve",
              value: earnings ? formatMoney(earnings.pending_minor, earnings.currency) : formatMoney(0),
              note: "Recent sales still inside the hold period",
            },
            {
              label: "Lifetime earned",
              value: earnings ? formatMoney(earnings.lifetime_minor, earnings.currency) : formatMoney(0),
            },
          ]}
        />

        <Panel
          title="Recent books"
          action={
            <Link href="/author/books" className="text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep">
              All books
            </Link>
          }
        >
          {(!recentBooks || recentBooks.length === 0) ? (
            <Empty title="No books yet">
              Create a draft, add your EPUB or PDF, set the NGN price and submit
              it for editorial review.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {recentBooks.map((book) => (
                <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/author/books/${book.id}`} className="text-[0.92rem] text-navy hover:underline">
                      {book.title}
                    </Link>
                    <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                      {book.status.replace(/_/g, " ")}
                      {book.review_note ? ` · ${book.review_note}` : ""}
                    </p>
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

        <Panel tone="quiet">
          <p className="text-[0.8rem] leading-relaxed text-charcoal-soft">
            Royalties are split 90% to the author and 10% to the platform on the
            listed price. Payment-gateway fees are recorded separately and are
            never taken out of your share without a matching ledger entry. The
            minimum NGN withdrawal is ₦5,000 and payouts are made manually while
            the gateway account is being verified.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
