import type { Metadata } from "next";
import Link from "next/link";
import {
  EmptyRow,
  Kpi,
  PageHead,
  Panel,
  Sparkbars,
  StatusPill,
  TableShell,
} from "@/components/dash";
import { getAdminOverview } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const { counts, money, series, recentOrders, queue, payouts } = await getAdminOverview();
  const pendingPayouts = payouts.filter((payout) => payout.status === "requested");

  return (
    <div>
      <PageHead
        eyebrow="Editorial console"
        title="The press at a glance"
        description="Sales, royalties and the review queue — the whole store in one screen."
        aside={
          <Link href="/admin/moderation" className="btn btn-ember h-10 px-4 text-[0.78rem]">
            Review queue{counts.pending > 0 ? ` (${counts.pending})` : ""}
          </Link>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Gross sales"
          value={formatNaira(money.revenue)}
          hint={`${counts.orders} paid ${counts.orders === 1 ? "order" : "orders"}`}
          tone="ink"
        />
        <Kpi
          label="Platform commission"
          value={formatNaira(money.fees)}
          hint={`${formatNaira(money.royalties)} paid to authors`}
        />
        <Kpi
          label="Review queue"
          value={counts.pending}
          hint={counts.pending > 0 ? "Waiting on an editor" : "Clear"}
          tone={counts.pending > 0 ? "ember" : "plain"}
        />
        <Kpi
          label="People"
          value={`${counts.authors} + ${counts.readers}`}
          hint={`${counts.authors} authors · ${counts.readers} readers`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel
            title="Revenue, last 14 days"
            aside={<span className="label text-ink-muted">₦ gross per day</span>}
          >
            <div className="p-5">
              <Sparkbars data={series} height={72} />
            </div>
          </Panel>

          <Panel
            title="Latest orders"
            aside={
              <Link href="/admin/orders" className="text-[0.75rem] font-medium text-ink hover:text-ember">
                All orders →
              </Link>
            }
          >
            <TableShell head={["Reference", "Status", "Placed", "Total"]}>
              {recentOrders.length === 0 ? (
                <EmptyRow colSpan={4}>No orders yet.</EmptyRow>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="text-[0.8rem]">
                    <td className="px-4 py-3 pl-5 font-mono text-[0.7rem] text-ink-soft">
                      {order.reference}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {formatDate(order.paid_at ?? order.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ink">
                      {formatNaira(order.total_kobo)}
                    </td>
                  </tr>
                ))
              )}
            </TableShell>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Waiting for review"
            aside={
              <Link href="/admin/moderation" className="text-[0.75rem] font-medium text-ink hover:text-ember">
                Open →
              </Link>
            }
          >
            {queue.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.82rem] text-ink-muted">
                The queue is empty. Every listing has been looked at.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {queue.map((book) => (
                  <li key={book.id} className="px-5 py-3.5">
                    <p className="truncate text-[0.85rem] font-medium text-ink">{book.title}</p>
                    <p className="mt-0.5 text-[0.7rem] text-ink-muted">
                      Submitted {formatDate(book.submitted_at ?? book.published_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Payouts to settle"
            aside={
              <Link href="/admin/payouts" className="text-[0.75rem] font-medium text-ink hover:text-ember">
                Manage →
              </Link>
            }
          >
            {pendingPayouts.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.82rem] text-ink-muted">
                No payout requests pending.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {pendingPayouts.slice(0, 4).map((payout) => (
                  <li key={payout.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-[0.85rem] font-medium text-ink">
                        {payout.author?.name ?? "Author"}
                      </p>
                      <p className="text-[0.7rem] text-ink-muted">
                        {formatDate(payout.requested_at)}
                      </p>
                    </div>
                    <p className="text-[0.85rem] font-medium tabular-nums text-ink">
                      {formatNaira(payout.amount_kobo)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="border border-line bg-paper-deep p-5">
            <p className="label text-ink-muted">Catalogue health</p>
            <dl className="mt-3 space-y-2 text-[0.82rem]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Published</dt>
                <dd className="font-medium text-ink">{counts.titles}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Drafts</dt>
                <dd className="font-medium text-ink">{counts.drafts}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">In review</dt>
                <dd className="font-medium text-ink">{counts.pending}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Payouts due</dt>
                <dd className="font-medium text-ink">{counts.payoutsDue}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
