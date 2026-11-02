import Link from "next/link";
import { DashboardShell, Empty, Panel, StatGrid } from "@/components/dashboard-shell";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";

type Stats = Record<string, number | string>;

export default async function AdminOverview() {
  await requireAdmin("/admin");
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return (
      <DashboardShell eyebrow="Administration" title="Dashboard" sections={adminNav()}>
        <Panel tone="warning">Accounts are not connected on this deployment.</Panel>
      </DashboardShell>
    );
  }

  const [{ data: statsData }, { data: settings }, { data: recentOrders }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("app_config").select("*").maybeSingle(),
    supabase
      .from("orders")
      .select("order_number, status, currency, total_minor, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const stats = (statsData ?? {}) as Stats;
  const number = (key: string) => Number(stats[key] ?? 0);

  return (
    <DashboardShell
      eyebrow="Administration"
      title="Platform overview"
      description="Live counts and ledger totals. Nothing on this page is cached or estimated."
      sections={adminNav({
        applications: number("applications_pending"),
        submissions: number("books_pending_review"),
        withdrawals: number("withdrawals_pending"),
        support: number("support_open"),
        copyright: number("copyright_open"),
      })}
    >
      <div className="space-y-8">
        {String(settings?.payments_mode) === "disabled" && (
          <Panel tone="warning">
            <p className="eyebrow text-charcoal-soft">Payments disabled</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed text-charcoal">
              Checkout is closed to readers. <Link href="/admin/settings" className="underline">Platform settings</Link>{" "}
              controls this flag. It should only be switched to test or live after
              the gateway credentials are set, the webhook hash secret is
              configured, and the ten payment test cases pass.
            </p>
          </Panel>
        )}

        <StatGrid
          stats={[
            { label: "Registered users", value: String(number("users_total")), note: `${number("users_new_7d")} in the last 7 days` },
            { label: "Approved authors", value: String(number("authors_approved")) },
            { label: "Applications pending", value: String(number("applications_pending")) },
            { label: "Published books", value: String(number("books_published")) },
            { label: "Awaiting review", value: String(number("books_pending_review")) },
            { label: "Paid orders", value: String(number("orders_paid")), note: `${number("orders_total")} total orders` },
            { label: "Gross (NGN)", value: formatMoney(number("gross_ngn_minor")) },
            { label: "Commission (NGN)", value: formatMoney(number("commission_ngn_minor")) },
            { label: "Author payable (NGN)", value: formatMoney(number("author_payable_ngn_minor")) },
            { label: "Withdrawals pending", value: String(number("withdrawals_pending")), note: formatMoney(number("withdrawals_pending_ngn_minor")) },
            { label: "Open support", value: String(number("support_open")) },
            { label: "Copyright open", value: String(number("copyright_open")) },
          ]}
        />

        <Panel title="Latest orders">
          {(!recentOrders || recentOrders.length === 0) ? (
            <Empty title="No orders yet" />
          ) : (
            <ul className="divide-y divide-line">
              {recentOrders.map((order) => (
                <li key={order.order_number} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.85rem]">
                  <span className="font-mono text-navy">{order.order_number}</span>
                  <span className="text-charcoal-soft">{formatLabel(order.status)} · {formatDate(order.created_at)}</span>
                  <span className="text-charcoal">{formatMoney(order.total_minor, order.currency as string)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel tone="quiet" title="What is not automated">
          <ul className="space-y-2 text-[0.8rem] leading-relaxed text-charcoal-soft">
            <li>Payouts are manual. An administrator approves, pays externally, then records the reference.</li>
            <li>Gateway fees are recorded per payment and reconciled by hand until the reconciliation job is tested.</li>
            <li>Copyright complaints are triaged by a person; nothing is auto-removed.</li>
          </ul>
        </Panel>
      </div>
    </DashboardShell>
  );
}
