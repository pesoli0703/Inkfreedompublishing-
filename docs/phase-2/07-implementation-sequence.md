# 07 — Implementation sequence

How this design becomes code, in an order where every step is reviewable,
reversible and testable. **Nothing here starts until you approve the design.**

---

## 1. Ground rules for the build

| Rule | Detail |
| --- | --- |
| Additive only | No `DROP`, no column removal, no destructive change without a written approval per migration |
| RLS ships with tables | A table and its policies land in the same migration. No table is ever created "open" |
| One migration = one concern | Small, named, reversible files: `0001_extensions.sql`, `0002_currencies.sql`, … |
| Non-production first | All work runs against a Supabase project created for development/preview — never your live project |
| No secrets in git | Variable **names** only, in `.env.example` |
| Homepage untouched | Phase 1 pages and design system stay as they are; the catalogue becomes data-driven behind the same components |
| Payments stay mocked | The provider adapter ships with a mock until you enable sandbox keys, let alone live ones |

---

## 2. Milestones

### Milestone 0 — Supabase project & baseline (½ day)

- Create a development Supabase project (separate from production).
- `git`-tracked `supabase/` directory: `config.toml`, `migrations/`, `seed.sql`
  (seed contains **no** real people, only clearly-marked demo fixtures that are
  never applied to production).
- Baseline migration: extensions, `private` schema, helper functions
  (`is_admin`, `current_author_id`, `set_updated_at`, `reject_mutation`).
- Verify local `supabase start` + `db reset` works end to end.

**Exit:** `supabase db reset` produces an empty, correctly configured database.

### Milestone 1 — Identity, roles, author onboarding (1–1.5 days)

- Tables: `profiles`, `author_applications`, `author_profiles`, `payout_accounts`,
  `currencies`, `platform_settings`.
- Triggers: profile creation, role guard, `updated_at`.
- Functions: `author_applications_admin_decide`.
- Policies + column grants for everything above.
- `@supabase/ssr` browser/server clients, cookie session, middleware route guards.
- Sign-in / sign-up / password reset wired to the **existing** `/signin` design.
- Author application form + admin decision endpoint (admin UI in Milestone 6).

**Exit:** a new user is a `reader`; cannot self-promote; can apply; an admin can
approve and the role becomes `author` with an audit row.

### Milestone 2 — Catalogue & moderation (2 days)

- Tables: `categories`, `books`, `book_formats`, `book_prices`, `book_files`,
  `book_moderation_events`, `book_contributors`; `published_books` and
  `published_book_offers` views.
- Status guard trigger + submission checklist function + moderation function.
- Replace `lib/data/*` reads with database reads **through the same component
  props** — the homepage, `/books`, `/categories`, `/authors` and book pages keep
  their exact design; only the data source changes.
- Author book CRUD (draft → submit) behind `/author`.

**Exit:** the storefront renders database content; a book cannot be published
without admin approval; a draft is invisible to everyone but its author.

### Milestone 3 — Private storage & downloads (1–1.5 days)

- Buckets + size/MIME limits; upload signing route; upload-complete registration
  with checksum.
- `download_authorize()` + `/api/download` route issuing 120-second signed URLs.
- `book-covers` public bucket for storefront imagery.
- Verify with a test: an anon request for a `book-files` object returns 400/403.

**Exit:** no private object is reachable without an entitlement-checked, expiring
signed URL; every issuance is logged.

### Milestone 4 — Commerce core, mock provider (2–2.5 days)

- Tables: `reader_addresses`, `orders`, `order_items`, `payments`, `payment_events`,
  `refunds`, `entitlements`, `download_events`.
- `order_create()` with server-resolved prices and snapshots.
- Provider abstraction: `initiateVerifiedPayment`, `verifyPayment`, `refundPayment`
  — interface + **mock** implementation (deterministic, test-only).
- `payment_verify_and_finalize()` end to end against the mock.
- Checkout UI wired to the existing book-page purchase panel (design unchanged).
- Reader library page.

**Exit:** a mock payment produces a paid order, an entitlement, a working download
link and a balanced ledger transaction — with no browser redirect involved in the
decision.

### Milestone 5 — Ledger, commissions, withdrawals (2 days)

- Tables: `ledger_transactions`, `ledger_entries`, `withdrawals`,
  `withdrawal_events`, `audit_log`; `author_balances` and `author_sales_lines` views.
- Sale/refund/chargeback/payout posting functions; balancing constraint trigger;
  immutability triggers.
- Author earnings page + CSV export; withdrawal request with balance lock.
- Admin withdrawal approval → payout posting (manual bank transfer).

**Exit:** ledger balances to zero across debits/credits for every scenario in the
test matrix; an author's statement reconciles exactly to their ledger rows.

### Milestone 6 — Admin dashboard (2–3 days)

- Routes under `/admin` per [06-moderation-and-admin.md](./06-moderation-and-admin.md).
- Moderation workspace, author applications, orders/payments console, withdrawals,
  settings, audit search.
- Re-authentication for settings and payouts.

**Exit:** every privileged action available in the UI is audited, and every screen
shows honest empty states.

### Milestone 7 — Flutterwave sandbox (gated)

**Starts only on your explicit go-ahead.**

- Sandbox keys in the preview environment only.
- Real checkout init, webhook endpoint, verification, reconciliation job.
- Test matrix: success, decline, wrong amount, duplicate webhook, missing webhook,
  refund, partial refund, currency not supported.
- Go-live checklist signed off before any live key is added.

### Milestone 8 — Hardening pass

- Load/soak on the catalogue and download paths.
- Security review against the threat model in doc 03.
- Backup/restore rehearsal; key-rotation rehearsal.
- Accessibility and mobile re-check of the new surfaces.

---

## 3. Suggested order of previews

Each milestone gets its own commit series and Vercel **preview** deployment on this
branch. No promotion to production at any point without your explicit approval.

| Preview | Shows |
| --- | --- |
| P2-a | Sign-in, sign-up, author application (Supabase Auth live in a dev project) |
| P2-b | Catalogue served from Postgres + author book workspace + submission |
| P2-c | Admin moderation queue; published book appears on the storefront |
| P2-d | Private downloads with signed URLs and entitlement checks |
| P2-e | Mock checkout → library → ledger → author earnings |
| P2-f | Withdrawals + finance views |
| P2-g | Flutterwave sandbox (only after approval) |

---

## 4. Environment variables (names only)

```bash
# .env.example — values are never committed
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server-only, never NEXT_PUBLIC_
SUPABASE_PROJECT_REF=
PAYMENTS_PROVIDER=mock                # mock | flutterwave
FLUTTERWAVE_PUBLIC_KEY=               # sandbox only when enabled
FLUTTERWAVE_SECRET_KEY=               # server-only
FLUTTERWAVE_WEBHOOK_SECRET=           # server-only
DOWNLOAD_URL_TTL_SECONDS=120
```

`.gitignore` already excludes `.env*`; a CI check will fail the build if a
service-role key appears in any tracked file.

---

## 5. Migration safety

| Practice | Reason |
| --- | --- |
| Every migration forward-only and idempotent (`if not exists`, `on conflict do nothing`) | Safe re-runs |
| Data migrations separate from schema migrations | Easier review and rollback |
| Backfill in batches with progress logging | No long locks on a live table |
| Additive columns nullable first, backfill, then constrain | Zero-downtime pattern |
| Destructive changes require a signed-off plan listing rows affected | Your explicit approval rule |
| `supabase db diff` reviewed before applying to the preview project | No surprise drift |
| Restore rehearsal before the first production migration | Confidence in rollback |
| No `TRUNCATE`, no `DROP TABLE`, no `DROP COLUMN` in this phase | Explicitly out of scope |

---

## 6. Test plan

| Layer | What is covered |
| --- | --- |
| **RLS matrix tests** (SQL, per role) | For each table × role: allowed operations succeed, forbidden ones raise. Run as `anon`, `reader_a`, `reader_b`, `author_a`, `author_b`, `admin` |
| **Cross-author isolation** | `author_b` cannot read `author_a`'s books, order items, ledger entries, withdrawals |
| **Privilege escalation** | Client-sent `role` ignored; direct `UPDATE profiles SET role` rejected; author cannot set `books.status = 'published'` |
| **Status machine** | Every legal transition succeeds; every illegal one raises |
| **Ledger** | Every transaction balances; replayed finalisation creates no second transaction; refunds reverse correctly; rounding sums exactly |
| **Payments** | Redirect-only cannot mark paid; wrong amount rejected; duplicate webhook ignored; late webhook after reconciliation ignored |
| **Storage** | Anon/authenticated direct object read fails; expired signed URL fails; entitlement revoked → new link refused |
| **Currency** | Disabled currency cannot be ordered; mixed-currency basket rejected; minor units respected |
| **Withdrawals** | Cannot exceed available balance; concurrent requests cannot double-spend |
| **Regression** | Phase 1 pages still render identically from database data |

Deliverable for Milestone 1 onward: `supabase/tests/` with pgTAP-style SQL tests
runnable in CI.

---

## 7. Decisions I need from you before coding

| # | Question | My default if you don't specify |
| --- | --- | --- |
| Q1 | Legal registration number, TIN and registered address for receipts? | Left `NULL`; receipts omit them until supplied |
| Q2 | Which currencies should be enabled at launch (after provider confirmation)? | NGN only enabled; USD/GBP/GHS/KES/ZAR present but disabled |
| Q3 | Should author applications be open to the public at launch, or invite-only? | Applications open, admin approval required |
| Q4 | Reserve hold (days) before earnings become withdrawable? | 7 days |
| Q5 | Payout minimum? | ₦5,000 |
| Q6 | Do you want reader wishlists in Phase 2 or later? | Later (schema is additive, no migration needed) |
| Q7 | Should co-authored books split royalties in v1? | No — primary author receives the 90%; contributors recorded for credit only |
| Q8 | Print shipping: enable at launch or digital-only first? | Digital-first; shipping tables exist but the UI is off |
| Q9 | Supabase project: create a new development project now, or wait? | Wait for your approval |
| Q10 | Automated provider payouts to authors, or manual approval of every payout? | Manual approval, always visible in the admin queue |

---

## 8. Definition of done for Phase 2

- [ ] Schema, policies and functions applied to a **development** Supabase project
- [ ] RLS test suite green for all six roles
- [ ] Storefront served from Postgres with the Phase 1 design unchanged
- [ ] Author workspace: create → submit → admin approval → publish
- [ ] Private downloads enforced; signed URLs expire in 120 s
- [ ] Mock checkout → entitlement → ledger → author statement, reconciled to the kobo
- [ ] Withdrawal request → approval → payout posting
- [ ] Admin dashboard operational and fully audited
- [ ] No secrets in git; no live payment keys; no production Supabase touched
- [ ] You have reviewed a preview deployment and approved the next step
