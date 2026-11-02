import type { Metadata } from "next";
import { PageHead, Panel } from "@/components/dash";
import { getStoreSettings } from "@/lib/admin";
import { updateSettingsAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const settings = await getStoreSettings();

  return (
    <div className="max-w-3xl">
      <PageHead
        eyebrow="Configuration"
        title="Store settings"
        description="Commission, currency and how checkout behaves. Changes apply to new orders only."
      />

      {params.saved ? (
        <div className="mt-6 border border-[#cbd9c1] bg-[#eaf0e4] px-4 py-3 text-[0.82rem] text-[#3f5a33]">
          Settings saved.
        </div>
      ) : null}
      {params.error === "commission" ? (
        <div className="mt-6 border border-ember/30 bg-ember/5 px-4 py-3 text-[0.82rem] text-ember-deep">
          Commission must be between 0 and 50 per cent.
        </div>
      ) : null}

      <form action={updateSettingsAction} className="mt-8 space-y-6">
        <Panel title="Commerce">
          <div className="space-y-5 p-5">
            <label className="block max-w-xs">
              <span className="label mb-2 block text-ink-muted">Platform commission (%)</span>
              <input
                name="commission"
                type="number"
                min="0"
                max="50"
                step="1"
                defaultValue={settings.commission_percent}
                className="field"
              />
              <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                The rest goes to the author. Currently{" "}
                {100 - settings.commission_percent}% to the author.
              </span>
            </label>

            <label className="block max-w-xs">
              <span className="label mb-2 block text-ink-muted">Currency</span>
              <input value="NGN — Nigerian Naira" disabled readOnly className="field bg-paper-deep text-ink-muted" />
              <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                Prices are stored in kobo and displayed with `Intl.NumberFormat`.
              </span>
            </label>

            <label className="block max-w-xs">
              <span className="label mb-2 block text-ink-muted">Checkout mode</span>
              <select name="checkout_mode" defaultValue={settings.checkout_mode} className="field">
                <option value="simulated">Simulated — no money moves</option>
                <option value="live">Live — requires processor keys</option>
              </select>
              <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
                Live mode does nothing until `FLUTTERWAVE_SECRET_KEY` is set in the
                deployment environment.
              </span>
            </label>
          </div>
        </Panel>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </div>
      </form>

      <Panel title="Environment" className="mt-8">
        <dl className="divide-y divide-line-soft text-[0.82rem]">
          {[
            {
              label: "Payment processor",
              value: "Not connected — orders are marked paid in simulated mode",
            },
            { label: "Ebook storage", value: "Supabase Storage · private bucket · signed URLs (120s)" },
            { label: "Cover storage", value: "Supabase Storage · public bucket" },
            { label: "Commission split", value: `${settings.commission_percent}% platform / ${100 - settings.commission_percent}% author` },
            { label: "Email delivery", value: "Not connected — no transactional email is sent" },
          ].map((row) => (
            <div key={row.label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[12rem_1fr]">
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
