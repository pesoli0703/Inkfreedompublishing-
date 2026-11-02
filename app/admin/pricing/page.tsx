import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { upsertFxAction, setPriceOverrideAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminPricingPage() {
  await requireAdmin("/admin/pricing");
  const supabase = await createServerSupabaseClient();

  const [{ data: currencies }, { data: rates }, { data: overrides }, { data: offers }] = supabase
    ? await Promise.all([
        supabase.from("currencies").select("code, name, minor_unit, is_enabled, provider_supported, settlement_currency, display_order").order("display_order"),
        supabase.from("fx_rates").select("id, base_code, quote_code, rate, source, fetched_at").order("fetched_at", { ascending: false }).limit(30),
        supabase
          .from("book_price_overrides")
          .select("id, currency, price_minor, reason, is_active, created_at, book_formats(format, books(title))")
          .order("created_at", { ascending: false }),
        supabase.from("book_offers_resolved").select("book_id, title, book_format_id, format, currency, price_minor, source").limit(60),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }];

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="Pricing, currencies & FX"
      description="Authors set one NGN base price. Everything else is derived from the stored rate table, with a source and a timestamp, or from an explicit override with a reason. Rates older than seven days are never used."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <Panel title="Launch currencies">
          {(!currencies || currencies.length === 0) ? (
            <Empty title="No currencies configured" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.82rem]">
                <thead>
                  <tr className="border-b border-line text-[0.62rem] uppercase tracking-[0.14em] text-charcoal-soft">
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Minor unit</th>
                    <th className="py-2 pr-4">Enabled</th>
                    <th className="py-2">Gateway support</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency) => (
                    <tr key={currency.code} className="border-b border-line/60">
                      <td className="py-2 pr-4 font-mono text-navy">{currency.code}</td>
                      <td className="py-2 pr-4 text-charcoal">{currency.name}</td>
                      <td className="py-2 pr-4 text-charcoal-soft">{currency.minor_unit}</td>
                      <td className="py-2 pr-4 text-charcoal-soft">{currency.is_enabled ? "yes" : "no"}</td>
                      <td className="py-2 text-charcoal-soft">{currency.provider_supported ? "confirmed" : "to confirm with merchant account"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
            International checkout stays closed for a currency until the merchant
            account is confirmed to accept it. Enabling a currency here does not
            enable payments — <code>payments_mode</code> does that.
          </p>
        </Panel>

        <Panel title="Record an FX rate">
          <AdminForm action={upsertFxAction} submitLabel="Store rate">
            <div className="grid gap-3 sm:grid-cols-4">
              <input name="base" defaultValue="NGN" maxLength={3} className={adminField} />
              <input name="quote" defaultValue="USD" maxLength={3} className={adminField} />
              <input name="rate" type="number" step="0.00000001" required placeholder="Rate" className={adminField} />
              <input name="source" placeholder="Source (e.g. provider name)" className={adminField} />
            </div>
          </AdminForm>
          <p className="mt-3 text-[0.72rem] leading-relaxed text-charcoal-soft">
            Rates are appended, never edited. The newest row wins for
            conversions, and every converted price records the rate, its source
            and its timestamp.
          </p>
        </Panel>

        <Panel title="Recent rates">
          {(!rates || rates.length === 0) ? (
            <Empty title="No rates stored">
              Conversions are disabled until a rate exists. Prices without a
              rate are shown as unavailable rather than guessed.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rates.map((rate) => (
                <li key={rate.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.82rem]">
                  <span className="font-mono text-navy">
                    {rate.base_code}→{rate.quote_code} {Number(rate.rate).toFixed(4)}
                  </span>
                  <span className="text-[0.72rem] text-charcoal-soft">
                    {rate.source} · {formatDate(rate.fetched_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Price overrides">
          <AdminForm action={setPriceOverrideAction} submitLabel="Save override">
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="book_format_id" required className={adminField}>
                <option value="">Choose a format</option>
                {(offers ?? [])
                  .filter((offer, index, all) => all.findIndex((other) => other.book_format_id === offer.book_format_id) === index)
                  .map((offer) => (
                    <option key={offer.book_format_id} value={offer.book_format_id}>
                      {offer.title} · {offer.format}
                    </option>
                  ))}
              </select>
              <select name="currency" required defaultValue="USD" className={adminField}>
                {["USD", "GBP", "EUR"].map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <input name="price" type="number" step="0.01" required placeholder="Price in that currency" className={adminField} />
              <input name="reason" required placeholder="Reason (required)" className={adminField} />
            </div>
          </AdminForm>
          <ul className="mt-5 divide-y divide-line">
            {(overrides ?? []).length === 0 ? (
              <li className="py-2 text-[0.82rem] text-charcoal-soft">No overrides set.</li>
            ) : (
              (overrides ?? []).map((override) => {
                const format = override.book_formats as unknown as { format: string; books: { title: string } | null } | null;
                return (
                  <li key={override.id} className="py-2 text-[0.82rem]">
                    <span className="text-navy">
                      {format?.books?.title ?? "Book"} · {format?.format} · {override.currency}{" "}
                      {formatMoney(override.price_minor, override.currency as string)}
                    </span>
                    <span className="text-[0.72rem] text-charcoal-soft"> — {override.reason}</span>
                  </li>
                );
              })
            )}
          </ul>
        </Panel>
      </div>
    </DashboardShell>
  );
}
