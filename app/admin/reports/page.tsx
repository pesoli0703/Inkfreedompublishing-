import { DashboardShell, Empty, Panel, StatGrid } from "@/components/dashboard-shell";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminReportsPage() {
  await requireAdmin("/admin/reports");
  const supabase = await createServerSupabaseClient();

  const [{ data: entries }, { data: payments }, { data: orders }] = supabase
    ? await Promise.all([
        supabase
          .from("ledger_entries")
          .select("id, account_type, direction, amount_minor, currency, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("payments")
          .select("id, currency, amount_minor, gateway_fee_minor, settlement_amount_minor, status, verified_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("orders")
          .select("id, order_number, currency, total_minor, commission_base_minor, fx_rate_to_base, status, placed_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const totals = new Map<string, number>();
  for (const entry of entries ?? []) {
    if (entry.direction !== "credit") continue;
    const key = `${entry.currency} ${entry.account_type}`;
    totals.set(key, (totals.get(key) ?? 0) + Number(entry.amount_minor));
  }

  const fees = (payments ?? []).reduce((sum, payment) => sum + Number(payment.gateway_fee_minor ?? 0), 0);
  const gross = (payments ?? [])
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + Number(payment.amount_minor), 0);

  const byCurrency = new Map<string, { orders: number; gross: number }>();
  for (const order of orders ?? []) {
    const key = String(order.currency);
    const current = byCurrency.get(key) ?? { orders: 0, gross: 0 };
    byCurrency.set(key, {
      orders: current.orders + 1,
      gross: current.gross + Number(order.total_minor),
    });
  }

  return (
    <DashboardShell
      eyebrow="Administration"
      title="Financial reports"
      description="Figures are read directly from the ledger and payment records. Where the data would require an estimate, this page shows nothing rather than a guess."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <StatGrid
          stats={[
            { label: "Verified gross (all currencies)", value: formatMoney(gross), note: "Summed across currencies; use per-currency totals below" },
            { label: "Gateway fees recorded", value: formatMoney(fees) },
            { label: "Ledger entries (recent)", value: String(entries?.length ?? 0) },
          ]}
        />

        <Panel title="Per-currency order totals">
          {byCurrency.size === 0 ? (
            <Empty title="No orders yet" />
          ) : (
            <ul className="divide-y divide-line">
              {[...byCurrency.entries()].map(([currency, value]) => (
                <li key={currency} className="flex items-center justify-between py-2 text-[0.85rem]">
                  <span className="font-mono text-navy">{currency}</span>
                  <span className="text-charcoal-soft">{value.orders} orders</span>
                  <span className="text-charcoal">{formatMoney(value.gross, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Ledger credits by account">
          {totals.size === 0 ? (
            <Empty title="Nothing posted yet" />
          ) : (
            <ul className="divide-y divide-line">
              {[...totals.entries()].map(([key, value]) => {
                const [currency, account] = key.split(" ");
                return (
                  <li key={key} className="flex items-center justify-between py-2 text-[0.85rem]">
                    <span className="text-charcoal">{account.replace(/_/g, " ")}</span>
                    <span className="font-mono text-[0.72rem] text-charcoal-soft">{currency}</span>
                    <span className="text-navy">{formatMoney(value, currency)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
            Commission and author payable are posted from the same transaction,
            and the database refuses any transaction whose debits do not equal
            its credits. Gateway fees sit on the payment record so they can be
            reconciled against a settlement report.
          </p>
        </Panel>

        <Panel title="Recent orders (audit view)" tone="quiet">
          {(!orders || orders.length === 0) ? (
            <Empty title="No orders" />
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 25).map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.8rem]">
                  <span className="font-mono text-navy">{order.order_number}</span>
                  <span className="text-charcoal-soft">
                    {order.status} · {formatDate(order.placed_at)} · fx {Number(order.fx_rate_to_base ?? 1).toFixed(4)}
                  </span>
                  <span className="text-charcoal">{formatMoney(order.total_minor, order.currency as string)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
