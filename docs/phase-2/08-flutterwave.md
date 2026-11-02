# Flutterwave integration (official REST API)

Status: **implemented and unit-tested; live mode deliberately disabled.** No real
Flutterwave transaction has been run from this environment (see *Blockers*).

## 1. How money moves

```
book page → POST /api/checkout            → place_order()      → order (amount locked, currency locked)
          → POST /api/payments/initiate   → open_payment()     → payments row + unique tx_ref
                                          → POST /v3/payments  → hosted checkout link (redirect)
gateway   → browser → GET /api/payments/verify?tx_ref=… → verify by id/reference → settle_payment()
gateway   → POST /api/webhooks/flutterwave → verif-hash check → dedupe → verify → settle_payment()
cron      → GET /api/cron/reconcile → re-verify stale initiated/pending payments → settle_payment()
```

`settle_payment()` is the only function that can grant access. It is
`SECURITY DEFINER`, granted to `service_role` only, and idempotent (a second call
returns `duplicate`). It re-checks amount and currency against the stored payment
row before it posts anything.

## 2. Files

| File | Purpose |
| --- | --- |
| `lib/payments/logic.ts` | Pure, tested rules: minor-unit parsing, currency enablement, reconciliation, 90/10 split, rate freshness |
| `lib/payments/flutterwave.ts` | v3 REST client: `POST /payments`, `GET /transactions/{id}/verify`, `verify_by_reference`, webhook signature verification (server-only) |
| `lib/payments/settle.ts` | Single settlement path used by redirect, webhook and cron |
| `app/api/payments/initiate/route.ts` | Server-side checkout initiation; amount/currency from the stored order |
| `app/api/payments/verify/route.ts` | Post-checkout verification; never trusts the redirect |
| `app/api/webhooks/flutterwave/route.ts` | Signature check, event logging, dedupe, verification, settlement |
| `app/api/cron/reconcile/route.ts` | Late/delayed payments, customers who closed the browser |
| `app/api/cron/fx/route.ts` | Daily FX refresh (provider, rate, timestamp) |
| `app/checkout/return/page.tsx` | Honest outcome screen: confirmed / pending / failed / cancelled / mismatch |
| `components/live-purchase-panel.tsx` | Currency + format selection, then order → initiate |
| `tests/*.test.ts` | 43 automated tests (see §6) |
| `supabase/migrations/0019…`, `0020…` | Settlement event cleanup, order amount immutability, reporting functions |

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Preview and
Production scopes separately). Never commit them.

| Name | Where it comes from | Required |
| --- | --- | --- |
| `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave dashboard → Settings → API Keys | yes |
| `FLUTTERWAVE_SECRET_KEY` | same page (server-side only) | yes |
| `FLUTTERWAVE_WEBHOOK_SECRET_HASH` | Flutterwave dashboard → Settings → Webhooks → *Secret hash* | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same page | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (secret key) | yes |
| `NEXT_PUBLIC_SITE_URL` | your preview/production URL | yes |
| `FX_PROVIDER_URL`, `FX_PROVIDER_API_KEY` | e.g. exchangerate.host / openexchangerates | optional |
| `CRON_SECRET` | you generate (e.g. `openssl rand -hex 32`) | yes for cron |

`FLUTTERWAVE_SECRET_HASH` is still accepted as a legacy alias for
`FLUTTERWAVE_WEBHOOK_SECRET_HASH`.

## 4. Flutterwave dashboard configuration

1. **Settings → API Keys**: copy the public and secret keys (test keys start
   `FLWPUBK_TEST-` / `FLWSECK_TEST-`).
2. **Settings → Webhooks**: set the URL to
   `https://<your-vercel-preview-domain>/api/webhooks/flutterwave`, type a random
   secret hash, and enable retries. Paste the same value into
   `FLUTTERWAVE_WEBHOOK_SECRET_HASH`.
3. **Settings → Payment methods / currencies**: enable only NGN, USD, GBP, EUR
   that your merchant account actually supports. The platform mirrors this in
   `public.currencies` (`is_enabled`, `provider_supported`) — a currency that is
   not enabled here is refused before a checkout link is created.
4. Test cards: <https://developer.flutterwave.com/docs/testing>.

## 5. Turning payments on (deliberately manual)

Payments are off while `platform_settings.payments_mode = 'disabled'`. To test in
the gateway's test mode:

```sql
update public.platform_settings set payments_mode = 'test';
```

Back to safe:

```sql
update public.platform_settings set payments_mode = 'disabled';
```

`open_payment()` raises a clear error while disabled, so checkout cannot create a
payment attempt. **Live mode is not enabled and must not be enabled until test
mode has been signed off.**

## 6. Automated tests

`npm test` (vitest, 43 tests, no network required):

* amount parsing incl. over-precision and garbage rejection
* currency enablement / merchant support / min–max
* reconciliation: failed, pending, unknown, underpayment, overpayment, wrong currency
* 90/10 split balances for every tested amount and rounds half-up
* FX freshness window
* webhook signature: correct `verif-hash`, wrong value, missing header, HMAC body signature, wrong body, unconfigured secret
* settlement: fee forwarded, idempotent replay, mismatch path, gateway unreachable
* webhook route: 401 on bad signature, duplicate delivery, settled, 500 retry, ignored events

SQL-level evidence from the live project (test mode, then reset to disabled):

| Check | Result |
| --- | --- |
| ₦2,500 sale | ledger `payment_clearing 250000 debit / author_payable 225000 credit / platform_revenue 25000 credit` |
| Ledger balance after all test sales | imbalance `0` |
| Gateway fee | `5000` stored on the payment, `settlement_amount_minor = 245000`, author share untouched |
| Duplicate settlement call | returns `duplicate` |
| Underpayment (1 minor unit) | payment `failed`, order `failed`, **0 entitlements** |
| Wrong currency (NGN order, USD settled) | refused, 0 entitlements |
| `admin_payments_report()` | NGN: 2 verified, gross 750000, fees 13500, commission 75000, author 675000, 1 failed |
| `author_sales_report()` | NGN: 2 verified sales, share 675000, reserve 675000, paid out 400000 |

## 7. Blockers / what is still unproven

* **No live gateway round-trip.** This sandbox has no outbound access to
  `api.flutterwave.com` or `*.supabase.co`, so the hosted-checkout redirect and a
  real webhook delivery have not been executed. Everything up to the HTTP call is
  covered by unit tests with a mocked transport; the gateway call itself must be
  exercised once with test keys on the Vercel preview.
* **Merchant currency enablement is unknown** until you check the dashboard.
  USD/GBP/EUR pricing is computed (FX + overrides), but checkout refuses any
  currency marked `provider_supported = false`.
* **FX provider not configured**, so non-NGN prices only appear where an admin
  override exists; stale rates (>7 days) are refused rather than guessed.
* **Automated reconciliation** needs a scheduler hitting
  `/api/cron/reconcile` and `/api/cron/fx` with `CRON_SECRET` (Vercel Cron).
* **Refunds** are recorded through `admin_record_refund`; the API call to
  Flutterwave's refund endpoint is not wired (deliberate: refunds stay manual
  until payout policy is agreed).
