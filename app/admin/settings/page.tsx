import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { updateSettingsAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminSettingsPage() {
  await requireAdmin("/admin/settings");
  const supabase = await createServerSupabaseClient();
  const { data: settings } = supabase
    ? await supabase.from("platform_settings").select("*").maybeSingle()
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Platform settings"
      description="These values drive pricing, payouts and checkout behaviour across the platform. Changes are written to the audit log with before and after values."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <Panel title="Commercial settings">
          <AdminForm action={updateSettingsAction} submitLabel="Save settings">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Commission (basis points, 1000 = 10%)
                <input name="platform_fee_bps" type="number" min="0" max="10000" defaultValue={settings?.platform_fee_bps ?? 1000} className={adminField + " mt-2"} />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Minimum withdrawal (NGN)
                <input
                  name="payout_minimum"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={Number(settings?.payout_minimum_minor ?? 500000) / 100}
                  className={adminField + " mt-2"}
                />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Reserve hold (days)
                <input name="reserve_hold_days" type="number" min="0" defaultValue={settings?.reserve_hold_days ?? 7} className={adminField + " mt-2"} />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Refund window (days)
                <input name="refund_window_days" type="number" min="0" defaultValue={settings?.refund_window_days ?? 7} className={adminField + " mt-2"} />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Download link lifetime (seconds)
                <input name="download_url_ttl_seconds" type="number" min="60" defaultValue={settings?.download_url_ttl_seconds ?? 604800} className={adminField + " mt-2"} />
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Price rounding
                <select name="price_rounding" defaultValue={settings?.price_rounding ?? "psychological"} className={adminField + " mt-2"}>
                  <option value="psychological">Psychological (round up a unit, minus 1)</option>
                  <option value="nearest_unit">Nearest whole unit</option>
                  <option value="none">No rounding</option>
                </select>
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Payments mode
                <select name="payments_mode" defaultValue={settings?.payments_mode ?? "disabled"} className={adminField + " mt-2"}>
                  <option value="disabled">Disabled — checkout closed</option>
                  <option value="test">Test mode</option>
                  <option value="live">Live</option>
                </select>
              </label>
              <label className="block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                Support email
                <input name="support_email" defaultValue={settings?.support_email ?? ""} className={adminField + " mt-2"} />
              </label>
            </div>
            <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
              Payments must stay disabled until the gateway credentials, webhook
              hash secret and the payment test matrix are all in place. Moving to
              live also requires the merchant account to be confirmed for
              international collections.
            </p>
          </AdminForm>
        </Panel>

        <Panel title="Identity and legal fields" tone="quiet">
          <dl className="grid gap-3 text-[0.85rem] sm:grid-cols-2">
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Brand</dt>
              <dd className="text-charcoal">{settings?.legal_brand_name ?? "INKFREEDOMPUBLISHING"}</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Parent</dt>
              <dd className="text-charcoal">{settings?.legal_parent_name ?? "PEACE-TECH MULTIBIZ COMMUNICATIONS"}</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Registration</dt>
              <dd className="text-charcoal">{settings?.legal_registration_type ?? "Nigerian Business Name"}</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Registration number</dt>
              <dd className="text-charcoal">{settings?.legal_registration_no ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Minimum withdrawal</dt>
              <dd className="text-charcoal">{formatMoney(settings?.payout_minimum_minor ?? 500000)}</dd>
            </div>
            <div>
              <dt className="text-[0.66rem] uppercase tracking-[0.14em] text-charcoal-soft">Last updated</dt>
              <dd className="text-charcoal">{formatDate(settings?.updated_at)}</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </DashboardShell>
  );
}
