import type { Metadata } from "next";
import Link from "next/link";
import { Crumbs, EmptyRow, Kpi, PageHead, Panel, Sparkbars, StatusPill, TableShell } from "@/components/dash";
import { requireAuthor } from "@/lib/auth";
import { getSalesSeries, getStudioOverview } from "@/lib/studio";
import { formatDate, formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Studio" };

export default async function StudioOverviewPage() {
  const viewer = await requireAuthor();
  const firstName = (viewer.profile.full_name ?? "there").split(" ")[0];
  const [{ books, sales, balance, counts }, series] = await Promise.all([
    getStudioOverview(viewer.author.id),
    getSalesSeries(viewer.author.id),
  ]);

  const inReview = counts.pending;

  return (
    <div>
      <PageHead
        eyebrow="Author studio"
        title={`Good to see you, ${firstName}.`}
        description="Everything you have published, everything it has earned, and what is waiting on the editor's desk."
        aside={
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/books/new" className="btn btn-primary h-10 px-4 text-[0.78rem]">
              Upload an edition
            </Link>
            <Link
              href={`/authors/${viewer.author.slug}`}
              className="btn btn-quiet h-10 px-4 text-[0.78rem]"
            >
              View public page
            </Link>
          </div>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Available to withdraw"
          value={formatNaira(Math.max(0, balance.available_kobo))}
          hint="Royalties cleared and not yet paid out"
          tone="ink"
        />
        <Kpi
          label="Lifetime royalties"
          value={formatNaira(balance.lifetime_kobo)}
          hint={`${balance.units_sold} ${balance.units_sold === 1 ? "copy" : "copies"} sold`}
        />
        <Kpi label="Last 30 days" value={formatNaira(balance.last_30_kobo)} hint="Author share" />
        <Kpi
          label="Editions"
          value={`${counts.published} live`}
          hint={
            inReview > 0
              ? `${inReview} awaiting review`
              : counts.drafts > 0
                ? `${counts.drafts} draft${counts.drafts === 1 ? "" : "s"}`
                : "Nothing in the queue"
          }
        />
      </div>

      {books.length === 0 ? (
        <div className="mt-8 border border-dashed border-line bg-paper-card px-6 py-14 text-center">
          <p className="font-display text-[1.6rem] text-ink">Your shelf is empty</p>
          <p className="mx-auto mt-2 max-w-sm text-[0.85rem] leading-relaxed text-ink-muted">
            Upload the PDF or ePub you have finished, add a cover, and submit it. An
            editor reviews every listing before it goes live.
          </p>
          <Link href="/studio/books/new" className="btn btn-primary mt-6">
            Upload your first edition
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <Panel title="Royalties, last 14 days" aside={<span className="label text-ink-muted">₦ per day</span>}>
              <div className="p-5">
                <Sparkbars data={series} />
              </div>
            </Panel>

            <Panel
              title="Recent sales"
              aside={
                <Link href="/studio/earnings" className="text-[0.75rem] font-medium text-ink hover:text-ember">
                  All earnings →
                </Link>
              }
            >
              <TableShell head={["Edition", "Reference", "Paid", "Your share"]}>
                {sales.length === 0 ? (
                  <EmptyRow colSpan={4}>
                    No sales yet. Published titles appear in the storefront immediately.
                  </EmptyRow>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="text-[0.82rem]">
                      <td className="max-w-[14rem] truncate px-4 py-3 pl-5 font-medium text-ink">
                        {sale.title}
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.7rem] text-ink-muted">
                        {sale.order?.reference ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                        {formatDate(sale.order?.paid_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ink">
                        {formatNaira(sale.author_share_kobo)}
                      </td>
                    </tr>
                  ))
                )}
              </TableShell>
            </Panel>
          </div>

          <Panel
            title="Your editions"
            aside={
              <Link href="/studio/books" className="text-[0.75rem] font-medium text-ink hover:text-ember">
                Manage →
              </Link>
            }
          >
            <ul className="divide-y divide-line-soft">
              {books.slice(0, 6).map((book) => (
                <li key={book.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/studio/books/${book.id}`}
                        className="block truncate text-[0.88rem] font-medium text-ink hover:text-ember"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-1 text-[0.7rem] text-ink-muted">
                        {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)} ·{" "}
                        {book.ebook_format === "epub" ? "ePub" : "PDF"}
                      </p>
                    </div>
                    <StatusPill status={book.status} />
                  </div>
                </li>
              ))}
            </ul>

            {counts.rejected > 0 ? (
              <div className="border-t border-line bg-ember/5 px-5 py-4">
                <p className="text-[0.78rem] font-medium text-ember-deep">
                  {counts.rejected} listing{counts.rejected === 1 ? "" : "s"} need
                  {counts.rejected === 1 ? "s" : ""} attention
                </p>
                <Link
                  href="/studio/books?status=rejected"
                  className="mt-1 inline-block text-[0.75rem] text-ember-deep underline underline-offset-2"
                >
                  Read the editor&apos;s note
                </Link>
              </div>
            ) : null}
          </Panel>
        </div>
      )}

      <div className="mt-10">
        <Crumbs items={[{ label: "Studio" }, { label: "Overview" }]} />
      </div>
    </div>
  );
}
