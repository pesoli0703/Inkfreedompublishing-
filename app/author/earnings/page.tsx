import { DashboardShell, Empty, Panel, StatGrid } from "@/components/dashboard-shell";
import { PayoutAccountForm, WithdrawalForm } from "@/components/earnings-forms";
import { authorNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";

export default async function EarningsPage() {
  await requireViewer("/author/earnings");
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return (
      <DashboardShell eyebrow="Author" title="Sales & earnings" sections={authorNav()}>
        <Panel tone="warning">Accounts are not connected on this deployment.</Panel>
      </DashboardShell>
    );
  }

  const [{ data: earnings }, { data: withdrawals }, { data: accounts }, { data: settings }] = await Promise.all([
    supabase.rpc("author_earnings", { p_currency: "NGN" }),
    supabase
      .from("withdrawals")
      .select("id, amount_minor, currency, status, requested_at, approved_at, paid_at, failure_reason")
      .order("requested_at", { ascending: false }),
    supabase.from("payout_accounts").select("id, bank_name, account_last4").is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("app_config").select("payout_minimum_minor, reserve_hold_days, platform_fee_bps").maybeSingle(),
  ]);

  const wallet = (earnings ?? [])[0] as
    | { currency: string; pending_minor: number; available_minor: number; lifetime_minor: number; paid_minor: number }
    | undefined;

  const accountOptions = (accounts ?? []).map((account) => ({
    id: account.id as string,
    label: `${account.bank_name} ···· ${account.account_last4}`,
  }));

  return (
    <DashboardShell
      eyebrow="Author"
      title="Sales & earnings"
      description="Your share is posted to the ledger when a payment is verified. Nothing here is an estimate."
      sections={authorNav()}
    >
      <div className="space-y-6">
        <StatGrid
          stats={[
            { label: "Lifetime earned", value: formatMoney(wallet?.lifetime_minor ?? 0) },
            { label: "Held in reserve", value: formatMoney(wallet?.pending_minor ?? 0), note: `${settings?.reserve_hold_days ?? 7}-day hold` },
            { label: "Available", value: formatMoney(wallet?.available_minor ?? 0) },
          ]}
        />

        <Panel title="Withdrawals" tone={accountOptions.length === 0 ? "warning" : "default"}>
          {accountOptions.length === 0 ? (
            <>
              <p className="mb-5 text-[0.85rem] leading-relaxed text-charcoal">
                Add a payout account before requesting a withdrawal. The minimum
                is {formatMoney(settings?.payout_minimum_minor ?? 500000)}.
              </p>
              <PayoutAccountForm />
            </>
          ) : (
            <>
              <WithdrawalForm accounts={accountOptions} />
              <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
                Minimum {formatMoney(settings?.payout_minimum_minor ?? 500000)}. Requests are
                reviewed and paid manually; you will see every status change
                below, and in your notifications.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Withdrawal history">
          {(!withdrawals || withdrawals.length === 0) ? (
            <Empty title="No withdrawals yet" />
          ) : (
            <ul className="divide-y divide-line">
              {withdrawals.map((withdrawal) => (
                <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.85rem]">
                  <div>
                    <p className="text-navy">{formatMoney(withdrawal.amount_minor, withdrawal.currency as string)}</p>
                    <p className="text-[0.72rem] text-charcoal-soft">
                      Requested {formatDate(withdrawal.requested_at)}
                      {withdrawal.paid_at ? ` · paid ${formatDate(withdrawal.paid_at)}` : ""}
                      {withdrawal.failure_reason ? ` · ${withdrawal.failure_reason}` : ""}
                    </p>
                  </div>
                  <span className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-charcoal-soft">
                    {formatLabel(withdrawal.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="How the split is calculated" tone="quiet">
          <ul className="space-y-2 text-[0.8rem] leading-relaxed text-charcoal-soft">
            <li>Commission: {(settings?.platform_fee_bps ?? 1000) / 100}% of the listed price on each sale, recorded as `platform_revenue` in the ledger.</li>
            <li>Author share: the remainder, recorded as `author_payable` against your author id.</li>
            <li>Gateway fees are recorded on the payment record only. They are never deducted from your share without an explicit, auditable adjustment entry.</li>
            <li>Sales inside the reserve hold are held back before the available figure is calculated.</li>
          </ul>
        </Panel>
      </div>
    </DashboardShell>
  );
}
