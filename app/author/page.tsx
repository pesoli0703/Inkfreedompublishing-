import Link from "next/link";
import { DashboardShell, Empty, NotConfigured, Panel, StatGrid } from "@/components/dashboard-shell";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { formatLabel } from "@/lib/format";

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

  const [{ data: author }, { data: stats }, { data: books }] = await Promise.all([
    supabase.from("author_profiles").select("id, pen_name, slug, status, bio, avatar_path").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("author_stats"),
    supabase
      .from("books")
      .select("id, title, status, submitted_at, review_note, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  if (!author) {
    return (
      <DashboardShell eyebrow="Author" title="Author dashboard" sections={authorNav()}>
        <Panel tone="warning">
          <p className="eyebrow text-charcoal-soft">Publishing is not set up yet</p>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-charcoal">
            Choose a pen name and your workspace opens straight away. There is no
            application to wait on — every eBook you upload is reviewed by an
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

  const rows = books ?? [];
  const buckets = {
    draft: rows.filter((book) => book.status === "draft").length,
    pending: rows.filter((book) => book.status === "submitted").length,
    changes: rows.filter((book) => book.status === "changes_requested").length,
    published: rows.filter((book) => ["published", "approved"].includes(String(book.status))).length,
    rejected: rows.filter((book) => book.status === "rejected").length,
  };

  return (
    <DashboardShell
      eyebrow="Author"
      title={author.pen_name}
      description="Upload eBooks, follow their review, and see what you have earned. Figures come from the ledger, not from estimates."
      sections={authorNav({
        review: typed?.books_in_review ?? buckets.pending,
        changes: typed?.books_changes_requested ?? buckets.changes,
      })}
      aside={
        <Link
          href="/author/books/new"
          className="inline-block bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
        >
          + Upload new eBook
        </Link>
      }
    >
      <div className="space-y-8">
        {/* The one action that matters, repeated where the eye lands. */}
        <Link
          href="/author/books/new"
          className="group flex flex-wrap items-center justify-between gap-4 border-2 border-dashed border-gold/60 bg-ivory p-6 transition-colors hover:border-gold hover:bg-white sm:p-8"
        >
          <div>
            <p className="font-display text-2xl text-navy">Upload new eBook</p>
            <p className="mt-1 max-w-md text-[0.85rem] leading-relaxed text-charcoal-soft">
              A PDF or an EPUB, a cover image, a price. Submit it and an
              administrator reviews it — it goes on sale as soon as it is approved.
            </p>
          </div>
          <span className="bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors group-hover:bg-navy-soft">
            Start upload
          </span>
        </Link>

        <StatGrid
          stats={[
            { label: "Pending approval", value: String(buckets.pending), note: "Waiting on an editor" },
            { label: "Published", value: String(buckets.published) },
            { label: "Rejected", value: String(buckets.rejected) },
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
            {
              label: "Withdrawals open",
              value: String(typed?.withdrawals_open ?? 0),
              note: "Requested or being paid",
            },
          ]}
        />

        <Panel
          title="My eBooks"
          action={
            <Link href="/author/books" className="text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep">
              All {rows.length}
            </Link>
          }
        >
          {rows.length === 0 ? (
            <Empty title="No eBooks yet">
              Upload a PDF or EPUB and its cover, set the price, and submit it for
              approval. Nothing else is required.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.slice(0, 6).map((book) => (
                <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/author/books/${book.id}`} className="text-[0.92rem] text-navy hover:underline">
                      {book.title}
                    </Link>
                    <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                      {formatLabel(book.status)}
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

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/author/earnings", title: "Sales & earnings", body: "Every sale, the 90/10 split and the ledger behind it." },
            { href: "/author/earnings#withdrawals", title: "Withdrawals", body: "Request a payout and follow its status." },
            { href: "/author/settings", title: "Author profile", body: "Your pen name, bio and avatar on the public page." },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="border border-line bg-white p-5 transition-colors hover:border-gold/60"
            >
              <p className="text-[0.88rem] font-semibold text-navy">{card.title}</p>
              <p className="mt-1 text-[0.78rem] leading-relaxed text-charcoal-soft">{card.body}</p>
            </Link>
          ))}
        </div>

        <Panel tone="quiet">
          <p className="text-[0.8rem] leading-relaxed text-charcoal-soft">
            Royalties are split 90% to the author and 10% to the platform on the
            listed price. Payment-gateway fees are recorded separately and are
            never taken out of your share without a matching ledger entry. Payouts
            are reviewed and paid manually.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
