import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { recordRefundAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  await requireAdmin("/admin/refunds");
  const { order: preselected } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const [{ data: refunds }, { data: orders }] = supabase
    ? await Promise.all([
        supabase
          .from("refunds")
          .select("id, amount_minor, currency, status, reason, created_at, completed_at, order_id, orders(order_number)")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("id, order_number, currency, total_minor, status, payments(status, amount_minor)")
          .in("status", ["fulfilled", "paid", "partially_refunded", "disputed"])
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: null }, { data: null }];

  return (
    <DashboardShell
      eyebrow="Commerce"
      title="Refunds & disputes"
      description="Recording a refund reverses the author and platform shares in the ledger. The gateway fee is not refunded unless the gateway says so, and is never silently absorbed."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <Panel title="Record a refund">
          <AdminForm action={recordRefundAction} submitLabel="Record refund" variant="primary">
            <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
              Order
              <select name="order_id" required defaultValue={preselected ?? ""} className={adminField + " mt-2"}>
                <option value="">Choose an order</option>
                {(orders ?? []).map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} · {formatMoney(order.total_minor, order.currency as string)} · {order.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Amount (major units)
                <input name="amount" type="number" min="0" step="0.01" required className={adminField + " mt-2"} />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Gateway refund id (if already refunded at the gateway)
                <input name="provider_refund_id" className={adminField + " mt-2"} />
              </label>
            </div>
            <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
              Reason (required, shown to the reader)
              <textarea name="reason" required rows={2} className={adminField + " mt-2"} />
            </label>
          </AdminForm>
          <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
            A full refund revokes the digital entitlement. A partial refund leaves
            access in place. Both post balancing ledger entries; an unbalanced
            transaction is rejected by the database.
          </p>
        </Panel>

        <Panel title="Refund history">
          {(!refunds || refunds.length === 0) ? (
            <Empty title="No refunds recorded" />
          ) : (
            <ul className="divide-y divide-line">
              {refunds.map((refund) => {
                const order = refund.orders as unknown as { order_number: string } | null;
                return (
                  <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.85rem]">
                    <div>
                      <p className="text-navy">
                        {formatMoney(refund.amount_minor, refund.currency as string)} · {order?.order_number}
                      </p>
                      <p className="text-[0.72rem] text-charcoal-soft">
                        {refund.reason} · {formatDate(refund.created_at)}
                      </p>
                    </div>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                      {refund.status}
                    </span>
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
