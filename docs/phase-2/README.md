# Phase 2 — Database architecture & Supabase preparation

**Status:** implemented on the Supabase project `xwqmfdsfmalxsirojuwi`
(migrations `0001`–`0020` applied) and running on Vercel **previews only**.
Nothing is promoted to production and no live payments are enabled. The
documents below remain the reference for what was built; when code and document
disagree, the migration files under `supabase/migrations/` win.

This folder is the complete architectural plan for turning INKFREEDOMPUBLISHING
from a catalogue front-end into a real multi-author publishing marketplace:
readers, authors, books, moderation, orders, payments, commissions, earnings and
withdrawals.

## Contents

| Document | Covers |
| --- | --- |
| [01-database-schema.md](./01-database-schema.md) | Every table, enum, constraint, index, view and database function |
| [02-entity-relationship-diagrams.md](./02-entity-relationship-diagrams.md) | Domain map, ER diagrams, approval state machine, money flow |
| [03-authentication-and-permissions.md](./03-authentication-and-permissions.md) | Auth flows, reader/author/admin roles, complete RLS matrix + policy SQL |
| [04-storage-architecture.md](./04-storage-architecture.md) | Private buckets, object paths, signed-URL download service, abuse controls |
| [05-payments-and-commissions.md](./05-payments-and-commissions.md) | Order lifecycle, server-side verification, double-entry ledger, 90/10 split, refunds, withdrawals, multi-currency |
| [06-moderation-and-admin.md](./06-moderation-and-admin.md) | Book approval workflow and the administrator dashboard plan |
| [07-implementation-sequence.md](./07-implementation-sequence.md) | Milestones, acceptance criteria, migration safety, test plan |
| [08-flutterwave.md](./08-flutterwave.md) | Flutterwave v3 integration: initiation, webhook verification, settlement, reconciliation, go-live checklist |
| [09-deployment-environment.md](./09-deployment-environment.md) | Which environment variables exist and where, how to prove a deployment is connected |

## The design in one page

**Identity.** Supabase Auth is the only source of identity. Every user row in
`auth.users` gets exactly one `profiles` row via trigger, with role `reader` by
default. `author` and `admin` are *not* self-assignable: becoming an author
requires an approved `author_applications` record, and admin is granted only by
another admin or by the service role. Author-specific data (pen name, bio, slug,
payout currency) lives in `author_profiles`, 1:1 with the profile.

**Catalogue.** `books` belongs to an `author_profiles` row and a `categories`
row. A book has `book_formats` (paperback / hardcover / ebook), and each format
has one or more `book_prices` rows — one per enabled currency. Digital assets are
`book_files` rows pointing at private storage objects, versioned and checksummed.
Books move through an explicit status machine: `draft → submitted →
changes_requested → approved → published`, with `rejected`, `unpublished` and
`archived` as terminal or recoverable exits.

**Commerce.** A `orders` row is created server-side with server-computed totals;
`order_items` snapshot title, format, unit price, currency and the commission rate
at the moment of sale, so later price edits never rewrite history. Every attempt
to pay creates a `payments` row. A payment can only reach `succeeded` through
server-side verification — a browser redirect alone can never mark an order paid,
and a database `CHECK` constraint enforces it.

**Money.** All amounts are integer minor units plus an ISO-4217 currency code.
On verified payment, a `ledger_transactions` row is posted with balanced
`ledger_entries` (double-entry): `payment_clearing` is debited, `author_payable`
is credited 90%, `platform_revenue` is credited 10%. Entries are append-only
(enforced by trigger), refunds post reversing entries, withdrawals debit
`author_payable`, and author balances are derived from the ledger — never stored
as an editable number.

**Access.** Row Level Security is enabled on every table with deny-by-default.
Authors read only their own books, their own sales lines and their own ledger;
they can never read another author's earnings, another reader's orders, or any
payment credential. Readers read only their own orders, entitlements and
addresses. Admins use the same RLS with explicit `is_admin()` policies, and every
privileged action is written to an immutable `audit_log`.

**Files.** `book-files` and `book-samples` are private buckets with **zero**
client-facing storage policies. Download links are minted by an Edge Function
that checks the caller's entitlement, rate-limits, logs the issuance, and returns
a signed URL that expires in 120 seconds.

## Decisions I made — confirm or override

| # | Decision | Rationale | Alternative |
| --- | --- | --- | --- |
| D1 | Single `profiles.role` enum (`reader`/`author`/`admin`) | One role per user keeps RLS simple and auditable | Many-to-many `user_roles` table if staff need multiple roles |
| D2 | Double-entry ledger with derived balances | Every naira traceable; balances cannot drift | Simple `earnings` table (rejected: not auditable) |
| D3 | Integer minor units + currency code | Eliminates float rounding in money | Postgres `numeric` decimals |
| D4 | Commission snapshot per order item | Historical accuracy if the rate changes | Read live settings at report time (rejected) |
| D5 | Prices per currency stored explicitly | Provider-supported amounts must be exact, not converted | FX-converted pricing from a base currency |
| D6 | Physical shipping modelled but not enabled at launch | Schema is additive; no migration later | Ship digital-only and defer |
| D7 | Files served only via signed Edge Function | No public URLs, entitlement enforced server-side | Storage RLS with public buckets |
| D8 | Flutterwave behind a provider abstraction | Sandbox/mock now, live keys only after approval | Direct provider SDK calls (harder to test) |

## Explicitly out of scope for this phase

- No live payment keys and no production promotion. The Flutterwave client,
  webhook and reconciliation code exists (see
  [08-flutterwave.md](./08-flutterwave.md)) but `platform_settings.payments_mode`
  stays `'disabled'` until real test keys are supplied and a round-trip is
  proven.
- No real authors, books or sales data are invented anywhere. Development
  fixtures, if any, are clearly marked seed data in a non-production project.
- No change to the existing homepage, marketplace UI or design system.
- No destructive migration. Every change proposed here is additive.

## What happens after your review

1. You approve or amend the schema, roles, ledger rules and workflow.
2. I create the Supabase project structure and baseline migration (Milestone 0–1
   in [07-implementation-sequence.md](./07-implementation-sequence.md)).
3. RLS policies ship **with** their tables, never after.
4. Payment code ships against a mock provider until you explicitly enable live
   Flutterwave keys.
