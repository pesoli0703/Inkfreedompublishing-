import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, Kpi, PageHead, Panel, StatusPill, TableShell } from "@/components/dash";
import { requireAuthor } from "@/lib/auth";
import { getStudioOverview } from "@/lib/studio";
import { formatDate, formatNaira } from "@/lib/format";
import { requestPayoutAction } from "@/lib/actions/author";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const viewer = await requireAuthor();
  const params = await searchParams;
  const { balance, sales, payouts } = await getStudioOverview(viewer.author.id);

  const notice =
    params.requested === "1"
      ? "Payout requested. The editor has been notified."
      : params.error === "insufficient"
        ? "That amount is more than your available balance."
        : params.error === "amount"
          ? "Enter an amount greater than zero."
          : null;

  return (
    <div>
      <PageHead
        eyebrow="Money"
        title="Earnings & payouts"
        description="Your share of every sale, recorded per order, with the 90/10 split applied at the time of purchase."
      />

      {notice ? (
        <div
          className={`mt-6 border px-4 py-3 text-[0.82rem] ${
            params.error
              ? "border-ember/30 bg-ember/5 text-ember-deep"
              : "border-[#cbd9c1] bg-[#eaf0e4] text-[#3f5a33]"
          }`}
        >
          {notice}
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Available to withdraw"
          value={formatNaira(Math.max(0, balance.available_kobo))}
          hint="After committed payouts"
          tone="ink"
        />
        <Kpi label="Lifetime royalties" value={formatNaira(balance.lifetime_kobo)} hint="All time" />
        <Kpi label="Last 30 days" value={formatNaira(balance.last_30_kobo)} hint="Author share" />
        <Kpi label="Copies sold" value={balance.units_sold} hint="Across all editions" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Request a payout">
          <div className="p-5">
            <p className="text-[0.82rem] leading-relaxed text-ink-muted">
              Payouts are settled by the press by bank transfer. Requests are reviewed
              in the admin console, so allow a little time.
            </p>

            <form action={requestPayoutAction} className="mt-5 space-y-4">
              <label className="block">
                <span className="label mb-2 block text-ink-muted">Amount (₦)</span>
                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  required
                  max={Math.max(1, Math.floor(balance.available_kobo / 100))}
                  defaultValue={Math.max(0, Math.floor(balance.available_kobo / 100)) || ""}
                  className="field"
                />
                <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                  Available: {formatNaira(Math.max(0, balance.available_kobo))}
                </span>
              </label>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={balance.available_kobo <= 0}
              >
                {balance.available_kobo <= 0 ? "Nothing available yet" : "Request payout"}
              </button>
            </form>
          </div>
        </Panel>

        <Panel title="Payout history">
          <TableShell head={["Requested", "Amount", "Status"]}>
            {payouts.length === 0 ? (
              <EmptyRow colSpan={3}>No payouts requested yet.</EmptyRow>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.id} className="text-[0.82rem]">
                  <td className="whitespace-nowrap px-4 py-3 pl-5 text-ink-muted">
                    {formatDate(payout.requested_at)}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-ink">
                    {formatNaira(payout.amount_kobo)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={payout.status} />
                  </td>
                </tr>
              ))
            )}
          </TableShell>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Sales ledger"
          aside={<span className="label text-ink-muted">Latest first</span>}
        >
          <TableShell head={["Edition", "Reference", "Sold", "Buyer paid", "Your share"]}>
            {sales.length === 0 ? (
              <EmptyRow colSpan={5}>
                No sales yet.{" "}
                <Link href="/studio/books/new" className="underline underline-offset-2">
                  Publish an edition
                </Link>{" "}
                to get started.
              </EmptyRow>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="text-[0.82rem]">
                  <td className="max-w-[16rem] truncate px-4 py-3 pl-5 font-medium text-ink">
                    {sale.title}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.7rem] text-ink-muted">
                    {sale.order?.reference ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                    {formatDate(sale.order?.paid_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">
                    {formatNaira(sale.unit_price_kobo)}
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
    </div>
  );
}
