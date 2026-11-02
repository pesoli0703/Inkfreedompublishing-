import type { Metadata } from "next";
import { EmptyRow, Kpi, PageHead, StatusPill, TableShell } from "@/components/dash";
import { listAdminOrders } from "@/lib/admin";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await listAdminOrders();
  const paid = orders.filter((order) => order.status === "paid");
  const gross = paid.reduce((sum, order) => sum + order.total_kobo, 0);
  const commission = Math.round(gross * 0.1);

  return (
    <div>
      <PageHead
        eyebrow="Commerce"
        title="Orders"
        description="Every order, with the royalty split captured at the moment of sale."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Paid orders" value={paid.length} />
        <Kpi label="Gross sales" value={formatNaira(gross)} tone="ink" />
        <Kpi label="Commission (10%)" value={formatNaira(commission)} />
        <Kpi label="Author royalties" value={formatNaira(gross - commission)} />
      </div>

      <div className="mt-6 border border-line bg-paper-card">
        <TableShell head={["Reference", "Reader", "Titles", "Status", "Placed", "Total"]}>
          {orders.length === 0 ? (
            <EmptyRow colSpan={6}>No orders yet.</EmptyRow>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="text-[0.8rem]">
                <td className="px-4 py-3 pl-5 font-mono text-[0.7rem] text-ink-soft">
                  {order.reference}
                </td>
                <td className="max-w-[12rem] px-4 py-3">
                  <p className="truncate text-ink">{order.reader?.full_name ?? "Reader"}</p>
                  <p className="truncate text-[0.66rem] text-ink-muted">
                    {order.reader?.email ?? "—"}
                  </p>
                </td>
                <td className="max-w-[14rem] px-4 py-3 text-ink-muted">
                  <p className="truncate">
                    {order.items.map((item) => item.title).join(", ") || "—"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={order.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {formatDateTime(order.paid_at ?? order.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ink">
                  {order.total_kobo === 0 ? "Free" : formatNaira(order.total_kobo)}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>

      <p className="mt-4 text-[0.72rem] text-ink-muted">
        Most recent {orders.length} orders. Last order{" "}
        {orders[0] ? formatDate(orders[0].paid_at ?? orders[0].created_at) : "—"}.
      </p>
    </div>
  );
}
