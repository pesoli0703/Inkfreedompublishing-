import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";

export default async function AdminOrdersPage() {
  await requireAdmin("/admin/orders");
  const supabase = await createServerSupabaseClient();
  const { data: orders } = supabase
    ? await supabase
        .from("orders")
        .select(
          "id, order_number, status, currency, total_minor, commission_base_minor, fx_rate_to_base, placed_at, paid_at, email, order_items(book_code_snapshot, title_snapshot, format_snapshot, quantity, unit_price_minor, line_total_minor), payments(status, provider_tx_ref, verified_at, verification_source, gateway_fee_minor)",
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Commerce"
      title="Orders & payments"
      description="Currency and amount are locked when the order is created. A payment only becomes successful after a server-side verification, never from a redirect."
      sections={adminNav()}
    >
      <Panel title={`${orders?.length ?? 0} recent orders`}>
        {(!orders || orders.length === 0) ? (
          <Empty title="No orders yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.82rem]">
              <thead>
                <tr className="border-b border-line text-[0.62rem] uppercase tracking-[0.14em] text-charcoal-soft">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Book ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Commission base</th>
                  <th className="py-2 pr-4">Payment</th>
                  <th className="py-2">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const items = (order.order_items ?? []) as unknown as {
                    book_code_snapshot: string;
                    title_snapshot: string;
                  }[];
                  const payment = (order.payments as unknown as {
                    status: string;
                    provider_tx_ref: string;
                    verified_at: string | null;
                    verification_source: string | null;
                    gateway_fee_minor: number | null;
                  }[] | null)?.[0];
                  return (
                    <tr key={order.id} className="border-b border-line/60">
                      <td className="py-3 pr-4 font-mono text-navy">{order.order_number}</td>
                      <td className="py-3 pr-4 font-mono text-[0.72rem] text-charcoal">
                        {items.map((item) => (
                          <span key={item.book_code_snapshot} className="block">
                            {item.book_code_snapshot}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 pr-4 text-charcoal">{formatLabel(order.status)}</td>
                      <td className="py-3 pr-4 text-charcoal">{formatMoney(order.total_minor, order.currency as string)}</td>
                      <td className="py-3 pr-4 text-charcoal-soft">{formatMoney(order.commission_base_minor, order.currency as string)}</td>
                      <td className="py-3 pr-4 text-charcoal-soft">
                        {payment ? (
                          <>
                            {formatLabel(payment.status)}
                            <span className="block text-[0.7rem]">
                              {payment.verified_at
                                ? `verified ${formatDate(payment.verified_at)} · ${payment.verification_source}`
                                : "unverified"}
                              {payment.gateway_fee_minor != null
                                ? ` · fee ${formatMoney(payment.gateway_fee_minor, order.currency as string)}`
                                : ""}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-charcoal-soft">{formatDate(order.placed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardShell>
  );
}
