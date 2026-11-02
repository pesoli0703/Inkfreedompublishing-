import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { transitionWithdrawalAction, recordPayoutAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";

const NEXT_STEPS: Record<string, string[]> = {
  requested: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["processing", "failed"],
  processing: ["paid", "failed"],
};

export default async function AdminWithdrawalsPage() {
  await requireAdmin("/admin/withdrawals");
  const supabase = await createServerSupabaseClient();
  const { data: withdrawals } = supabase
    ? await supabase
        .from("withdrawals")
        .select(
          "id, amount_minor, currency, status, requested_at, approved_at, paid_at, author_id, failure_reason, payout_accounts(bank_name, account_last4), author_profiles(pen_name)",
        )
        .order("requested_at", { ascending: false })
    : { data: null };

  const open = (withdrawals ?? []).filter((withdrawal) =>
    ["requested", "under_review", "approved", "processing"].includes(withdrawal.status as string),
  );
  const closed = (withdrawals ?? []).filter((withdrawal) => !open.includes(withdrawal));

  return (
    <DashboardShell
      eyebrow="Commerce"
      title="Withdrawals & payouts"
      description="Payouts are manual. Approving posts the payout ledger entry; recording a payout marks the withdrawal paid with the reference you paid under."
      sections={adminNav({ withdrawals: open.length })}
    >
      <div className="space-y-6">
        <Panel title={`Open requests (${open.length})`}>
          {open.length === 0 ? (
            <Empty title="Nothing pending" />
          ) : (
            <ul className="space-y-6">
              {open.map((withdrawal) => {
                const author = withdrawal.author_profiles as unknown as { pen_name: string } | null;
                const account = withdrawal.payout_accounts as unknown as { bank_name: string; account_last4: string } | null;
                const steps = NEXT_STEPS[withdrawal.status as string] ?? [];
                return (
                  <li key={withdrawal.id} className="border border-line p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-lg text-navy">
                          {formatMoney(withdrawal.amount_minor, withdrawal.currency as string)}
                        </p>
                        <p className="text-[0.75rem] text-charcoal-soft">
                          {author?.pen_name ?? "Author"} · {account ? `${account.bank_name} ···· ${account.account_last4}` : "no account"} · requested {formatDate(withdrawal.requested_at)}
                        </p>
                      </div>
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                        {formatLabel(withdrawal.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {steps.map((step) => (
                        <AdminForm
                          key={step}
                          action={transitionWithdrawalAction}
                          submitLabel={formatLabel(step)}
                          variant={step === "rejected" || step === "failed" ? "danger" : "quiet"}
                        >
                          <input type="hidden" name="withdrawal_id" value={withdrawal.id} />
                          <input type="hidden" name="to" value={step} />
                          <input
                            name="note"
                            placeholder={step === "rejected" || step === "failed" ? "Reason (required)" : "Note (optional)"}
                            className={adminField}
                          />
                        </AdminForm>
                      ))}
                    </div>

                    {["approved", "processing"].includes(withdrawal.status as string) && (
                      <div className="mt-5 border-t border-line pt-4">
                        <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                          Record the manual payout
                        </p>
                        <AdminForm action={recordPayoutAction} submitLabel="Record as paid">
                          <input type="hidden" name="withdrawal_id" value={withdrawal.id} />
                          <input
                            type="hidden"
                            name="amount"
                            value={(Number(withdrawal.amount_minor) / 100).toString()}
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input name="method" required placeholder="Bank transfer" className={adminField} />
                            <input name="reference" required placeholder="Bank reference" className={adminField} />
                          </div>
                        </AdminForm>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="History">
          {closed.length === 0 ? (
            <Empty title="No completed withdrawals" />
          ) : (
            <ul className="divide-y divide-line">
              {closed.map((withdrawal) => {
                const author = withdrawal.author_profiles as unknown as { pen_name: string } | null;
                return (
                  <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.85rem]">
                    <div>
                      <p className="text-navy">{formatMoney(withdrawal.amount_minor, withdrawal.currency as string)}</p>
                      <p className="text-[0.72rem] text-charcoal-soft">
                        {author?.pen_name ?? "Author"} · {formatDate(withdrawal.paid_at ?? withdrawal.requested_at)}
                        {withdrawal.failure_reason ? ` · ${withdrawal.failure_reason}` : ""}
                      </p>
                    </div>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                      {formatLabel(withdrawal.status)}
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
