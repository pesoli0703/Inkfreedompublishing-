import { DashboardShell, Empty, Panel, NotConfigured } from "@/components/dashboard-shell";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";

export default async function OrdersPage() {
  await requireViewer("/dashboard/orders");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Reader" title="Orders & payments" sections={readerNav()}>
        <NotConfigured what="Order history" />
      </DashboardShell>
    );
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, currency, subtotal_minor, discount_minor, total_minor, placed_at, paid_at, coupon_code, order_items(book_code_snapshot, title_snapshot, format_snapshot, quantity, unit_price_minor, line_total_minor), payments(status, provider, provider_tx_ref, amount_minor, currency, verified_at, verification_source)",
    )
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      eyebrow="Reader"
      title="Orders & payments"
      description="Amounts are locked in the currency you paid in. Payment status only changes after the gateway response is verified on our server."
      sections={readerNav()}
    >
      {(!orders || orders.length === 0) ? (
        <Empty title="No orders yet">
          Your order history, payment references and receipts will be listed
          here.
        </Empty>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const items = (order.order_items ?? []) as unknown as {
              book_code_snapshot: string;
              title_snapshot: string;
              format_snapshot: string;
              quantity: number;
              unit_price_minor: number;
              line_total_minor: number | null;
            }[];
            const payments = (order.payments ?? []) as unknown as {
              status: string;
              provider: string;
              provider_tx_ref: string;
              amount_minor: number;
              currency: string;
              verified_at: string | null;
              verification_source: string | null;
            }[];

            return (
              <Panel key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="font-mono text-[0.82rem] text-navy">{order.order_number}</p>
                    <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                      Placed {formatDate(order.placed_at)} · {formatLabel(order.status)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-navy">
                      {formatMoney(order.total_minor, order.currency)}
                    </p>
                    {order.discount_minor > 0 && (
                      <p className="text-[0.7rem] text-gold-deep">
                        {order.coupon_code} applied
                      </p>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-2">
                  {items.map((item, index) => (
                    <li key={index} className="flex items-center justify-between gap-3 text-[0.85rem]">
                      <span className="text-charcoal">
                        <span className="block font-mono text-[0.68rem] tracking-[0.04em] text-charcoal-soft">
                          {item.book_code_snapshot}
                        </span>
                        {item.title_snapshot}
                        <span className="text-charcoal-soft"> · {item.format_snapshot}</span>
                      </span>
                      <span className="text-charcoal-soft">
                        {item.quantity} × {formatMoney(item.unit_price_minor, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 border-t border-line pt-4 text-[0.75rem] text-charcoal-soft">
                  {payments.length === 0 ? (
                    <p>No payment attempt recorded yet.</p>
                  ) : (
                    payments.map((payment, index) => (
                      <p key={index} className="mt-1">
                        {formatLabel(payment.status)} · {payment.provider} ·{" "}
                        <span className="font-mono">{payment.provider_tx_ref}</span>
                        {payment.verified_at
                          ? ` · verified ${formatDate(payment.verified_at)} (${payment.verification_source})`
                          : " · awaiting server verification"}
                      </p>
                    ))
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
