import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { upsertCouponAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminCouponsPage() {
  await requireAdmin("/admin/coupons");
  const supabase = await createServerSupabaseClient();
  const { data: coupons } = supabase
    ? await supabase
        .from("coupons")
        .select("id, code, type, value, currency, min_order_minor, max_redemptions, times_redeemed, starts_at, ends_at, is_active")
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Commerce"
      title="Coupons"
      description="Percentage coupons are stored in basis points (10% = 1000). Discounts reduce the commission base, so the author and platform shares stay proportional."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <Panel title="Create or replace a coupon">
          <AdminForm action={upsertCouponAction} submitLabel="Save coupon">
            <div className="grid gap-3 sm:grid-cols-3">
              <input name="code" required placeholder="Code" className={adminField} />
              <select name="type" className={adminField} defaultValue="percentage">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
              <input name="value" type="number" step="0.01" required placeholder="10 (=10%) or 1500 (=₦1,500)" className={adminField} />
              <input name="currency" defaultValue="NGN" maxLength={3} className={adminField} />
              <input name="min_order" type="number" step="1" placeholder="Minimum order (₦)" className={adminField} />
              <input name="max_redemptions" type="number" min="1" placeholder="Max redemptions" className={adminField} />
              <input name="starts_at" type="datetime-local" className={adminField} />
              <input name="ends_at" type="datetime-local" className={adminField} />
              <label className="flex items-center gap-2 text-[0.8rem] text-charcoal">
                <input type="checkbox" name="is_active" defaultChecked /> Active
              </label>
            </div>
            <input name="description" placeholder="Description (optional)" className={adminField} />
          </AdminForm>
        </Panel>

        <Panel title="Existing coupons">
          {(!coupons || coupons.length === 0) ? (
            <Empty title="No coupons yet" />
          ) : (
            <ul className="divide-y divide-line">
              {coupons.map((coupon) => (
                <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.85rem]">
                  <div>
                    <p className="font-mono text-navy">{coupon.code}</p>
                    <p className="text-[0.72rem] text-charcoal-soft">
                      {coupon.type === "percentage"
                        ? `${Number(coupon.value) / 100}% off`
                        : `${formatMoney(coupon.value, coupon.currency as string)} off`}
                      {" · min "}
                      {formatMoney(coupon.min_order_minor, coupon.currency as string)}
                      {" · used "}
                      {coupon.times_redeemed}
                      {coupon.max_redemptions ? `/${coupon.max_redemptions}` : ""}
                      {" · from "}
                      {formatDate(coupon.starts_at)}
                      {coupon.ends_at ? ` to ${formatDate(coupon.ends_at)}` : ""}
                    </p>
                  </div>
                  <span className={`text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${coupon.is_active ? "text-navy" : "text-charcoal-soft"}`}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
