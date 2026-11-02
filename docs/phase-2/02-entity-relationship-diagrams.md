# 02 — Entity relationship diagrams

Diagrams are Mermaid, so they render directly on GitHub in the pull request. A
plain-text relationship table follows each diagram for reviewers who prefer it
(and for anywhere Mermaid is not rendered).

The schema is split into five domains so each diagram stays readable:

1. Identity & author onboarding
2. Catalogue & moderation
3. Commerce & payments
4. Money, ledger & payouts
5. Fulfilment & storage

---

## 1. Domain overview

```mermaid
erDiagram
  profiles ||--o| author_profiles : "may become"
  profiles ||--o{ author_applications : "submits"
  profiles ||--o{ reader_addresses : "stores"
  profiles ||--o{ orders : "places"

  author_profiles ||--o{ books : "publishes"
  author_profiles ||--o{ payout_accounts : "registers"
  author_profiles ||--o{ withdrawals : "requests"
  author_profiles ||--o{ ledger_entries : "is credited by"

  categories ||--o{ books : "classifies"
  books ||--o{ book_formats : "offered as"
  book_formats ||--o{ book_prices : "priced in"
  books ||--o{ book_files : "has assets"
  books ||--o{ book_moderation_events : "audited by"
  books ||--o{ book_contributors : "credits"
  books ||--o{ entitlements : "granted through"
  books ||--o{ order_items : "sold as"

  orders ||--o{ order_items : "contains"
  orders ||--o{ payments : "settled by"
  orders ||--o{ entitlements : "grants"
  payments ||--o{ refunds : "refunded by"
  payments ||--o{ ledger_transactions : "posts"
  refunds ||--o{ ledger_transactions : "reverses"

  ledger_transactions ||--|{ ledger_entries : "balances as"
  withdrawals ||--o{ ledger_transactions : "settles to"
  withdrawals ||--o{ withdrawal_events : "audited by"

  currencies ||--o{ book_prices : "denominates"
  currencies ||--o{ orders : "denominates"
  currencies ||--o{ ledger_entries : "denominates"
  platform_settings ||--|| currencies : "base is in"

  entitlements ||--o{ download_events : "records"
  book_files ||--o{ download_events : "serves"
  storage_bucket_book_files }o--|| book_files : "hosts (private)"
```

> `storage_bucket_book_files` is illustrative only — Supabase Storage is managed
> outside the `public` schema. Bucket layout is specified in doc 04.

---

## 2. Identity & author onboarding

```mermaid
erDiagram
  profiles {
    uuid id PK "FK auth.users.id"
    app_role role "reader | author | admin"
    account_status status
    citext email "from auth"
    text display_name
    char3 preferred_currency FK
    timestamptz created_at
  }

  author_applications {
    uuid id PK
    uuid user_id FK
    text pen_name
    application_status status
    uuid decided_by FK
    timestamptz decided_at
  }

  author_profiles {
    uuid id PK
    uuid user_id FK "unique"
    citext slug UK
    text pen_name
    author_status status "applicant | approved | suspended"
    char3 payout_currency FK
    uuid approved_by FK
  }

  payout_accounts {
    uuid id PK
    uuid author_id FK
    text provider_recipient_ref "token, never an account number"
    char4 account_last4
    char3 currency FK
    boolean is_default
  }

  profiles ||--o{ author_applications : "files"
  profiles ||--o| author_profiles : "owns"
  profiles ||--o{ payout_accounts : "author owns"
  author_profiles ||--o{ payout_accounts : "payout to"
  profiles ||--o{ profiles : "approved_by"
```

**Rules embodied here**

- One `profiles` row per `auth.users` row (created by trigger).
- `author_profiles.user_id` is `UNIQUE`: a user is at most one author identity.
- `author_profiles.status = 'approved'` is only reachable by an admin decision
  recorded in `author_applications` and `audit_log`.
- `payout_accounts` stores a provider token and `last4` — no account numbers.

---

## 3. Catalogue & moderation

```mermaid
erDiagram
  categories {
    uuid id PK
    citext slug UK
    text name
    integer sort_order
    boolean is_active
  }

  books {
    uuid id PK
    uuid author_id FK
    uuid category_id FK
    citext slug UK
    text title
    book_status status
    timestamptz submitted_at
    uuid reviewed_by FK
    timestamptz published_at
    timestamptz deleted_at
  }

  book_formats {
    uuid id PK
    uuid book_id FK
    book_format format "paperback | hardcover | ebook"
    boolean is_available
    uuid file_id FK
  }

  book_prices {
    uuid id PK
    uuid book_format_id FK
    char3 currency FK
    bigint price_minor "minor units"
    boolean is_active
  }

  book_files {
    uuid id PK
    uuid book_id FK
    file_kind kind "ebook | pdf | sample | interior | cover"
    text storage_bucket
    text storage_path "never exposed"
    text checksum_sha256
    integer version
  }

  book_moderation_events {
    bigserial id PK
    uuid book_id FK
    book_status from_status
    book_status to_status
    text action
    uuid actor_id FK
  }

  book_contributors {
    uuid id PK
    uuid book_id FK
    uuid author_id FK
    text display_name
    text role
  }

  categories ||--o{ books : "classifies"
  books ||--|{ book_formats : "has"
  book_formats ||--o{ book_prices : "priced per currency"
  books ||--o{ book_files : "stores"
  book_formats ||--o| book_files : "digital file"
  books ||--o{ book_moderation_events : "history"
  books ||--o{ book_contributors : "credits"
  author_profiles ||--o{ books : "owns"
```

**Reading the cardinalities:** a book must have at least one format to be
published; a digital format needs a `book_files` row; a format may be priced in
several currencies, one row each.

---

## 4. Commerce & payments

```mermaid
erDiagram
  orders {
    uuid id PK
    text order_number UK
    uuid reader_id FK
    order_status status
    char3 currency FK
    bigint subtotal_minor
    bigint shipping_minor
    bigint tax_minor
    bigint total_minor
    bigint commission_base_minor
    numeric fx_rate_to_base
    timestamptz paid_at
  }

  order_items {
    uuid id PK
    uuid order_id FK
    uuid book_id FK
    uuid book_format_id FK
    uuid author_id FK
    char3 currency FK
    bigint unit_price_minor
    bigint line_total_minor
    integer commission_bps "snapshot at sale"
  }

  payments {
    uuid id PK
    uuid order_id FK
    text provider_tx_ref UK
    text provider_transaction_id UK
    payment_status status
    bigint amount_minor
    timestamptz verified_at
    verification_source verification_source
    bigint verified_amount_minor
  }

  payment_events {
    bigserial id PK
    text provider_event_id UK
    boolean signature_valid
    jsonb payload
    text processing_status
  }

  refunds {
    uuid id PK
    uuid payment_id FK
    uuid order_id FK
    bigint amount_minor
    text status
  }

  entitlements {
    uuid id PK
    uuid reader_id FK
    uuid book_id FK
    uuid order_id FK
    entitlement_kind kind
    timestamptz granted_at
    timestamptz revoked_at
  }

  profiles ||--o{ orders : "places"
  orders ||--|{ order_items : "contains"
  books ||--o{ order_items : "sold as"
  book_formats ||--o{ order_items : "in format"
  orders ||--o{ payments : "attempts"
  payments ||--o{ payment_events : "reported by"
  payments ||--o{ refunds : "refunded by"
  orders ||--o{ entitlements : "grants"
  profiles ||--o{ entitlements : "owns library"
  books ||--o{ entitlements : "granted for"
```

**Invariant shown above:** `payments.status = 'succeeded'` is impossible unless
`verified_at`, `verification_source` and `verified_amount_minor` are all set —
enforced by a table-level `CHECK`.

---

## 5. Money, ledger & payouts

```mermaid
erDiagram
  ledger_transactions {
    uuid id PK
    ledger_txn_kind kind
    uuid order_id FK
    uuid payment_id FK
    uuid refund_id FK
    uuid withdrawal_id FK
    char3 currency FK
    char3 base_currency FK
    numeric fx_rate
    integer commission_bps
    text idempotency_key UK
  }

  ledger_entries {
    bigserial id PK
    uuid transaction_id FK
    ledger_account account_type
    uuid author_id FK
    ledger_direction direction
    bigint amount_minor
    char3 currency FK
    bigint base_amount_minor
  }

  withdrawals {
    uuid id PK
    uuid author_id FK
    uuid payout_account_id FK
    bigint amount_minor
    withdrawal_status status
    uuid ledger_transaction_id FK
  }

  withdrawal_events {
    bigserial id PK
    uuid withdrawal_id FK
    withdrawal_status from_status
    withdrawal_status to_status
    uuid actor_id FK
  }

  audit_log {
    bigserial id PK
    uuid actor_id FK
    app_role actor_role
    text action
    text entity_type
    text entity_id
    jsonb before_state
    jsonb after_state
  }

  ledger_transactions ||--|{ ledger_entries : "posts"
  author_profiles ||--o{ ledger_entries : "earns"
  author_profiles ||--o{ ledger_transactions : "payout via"
  withdrawals ||--o{ ledger_transactions : "settles"
  payout_accounts ||--o{ withdrawals : "paid into"
  withdrawals ||--o{ withdrawal_events : "history"
  payments ||--o{ ledger_transactions : "sales posts"
  refunds ||--o{ ledger_transactions : "reversals post"
  profiles ||--o{ audit_log : "acts in"
```

---

## 6. Money flow for one ₦10,000 sale

The same shape is used for every currency; amounts below are illustrative of the
90/10 rule, not of real prices.

```mermaid
flowchart LR
  R["Reader pays ₦10,000"] --> P["payment_clearing<br/>DEBIT 10,000"]
  P --> A["author_payable<br/>CREDIT 9,000"]
  P --> F["platform_revenue<br/>CREDIT 1,000"]
  A -.->|"reserve_hold_days elapse"| W["withdrawal approved"]
  W --> AP["author_payable<br/>DEBIT 9,000"]
  W --> PC["payout_clearing<br/>CREDIT 9,000"]
```

Balanced within one `ledger_transactions` row: debits 10,000 = credits 10,000.

Refund of the same order posts a new transaction, never edits the first:

```mermaid
flowchart LR
  AP2["author_payable<br/>DEBIT 9,000"] --> PR["payment_clearing<br/>CREDIT 10,000"]
  PR2["platform_revenue<br/>DEBIT 1,000"] --> PR
```

---

## 7. Book approval state machine

```mermaid
stateDiagram-v2
  [*] --> draft : author creates book
  draft --> submitted : author submits
  submitted --> changes_requested : admin requests edits
  submitted --> rejected : admin rejects
  submitted --> approved : admin approves
  changes_requested --> submitted : author resubmits
  changes_requested --> draft : author withdraws
  approved --> published : admin publishes
  published --> unpublished : admin withholds
  unpublished --> published : admin reinstates
  rejected --> draft : author reworks
  draft --> archived : author archives
  published --> archived : admin retires
  archived --> [*]
```

Author-allowed transitions are only `draft → submitted`,
`changes_requested → submitted`, `changes_requested → draft` and `→ archived`.
Everything else requires the service role (administrator actions) and is checked
in the `books_status_guard` trigger — not just in the UI.

---

## 8. Payment verification sequence

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant W as Next.js server route
  participant DB as Postgres (RLS + functions)
  participant FW as Flutterwave
  participant WH as Webhook Edge Function

  B->>W: POST /api/checkout/start {items, currency}
  W->>DB: rpc order_create() — server-resolved prices
  DB-->>W: order (pending_payment) + payment (initiated)
  W->>FW: create payment session (server-side secret key)
  FW-->>W: hosted checkout link / init payload
  W-->>B: redirect to provider

  B->>FW: card / transfer / USSD
  FW-->>B: redirect to /checkout/callback?tx_ref=...
  Note over B,W: Redirect is a HINT ONLY. Nothing is marked paid.
  B->>W: GET /api/checkout/callback
  W-->>B: "Verifying your payment…" (order still pending)

  FW->>WH: POST webhook (verif-hash header)
  WH->>DB: insert payment_events (raw, deduped by event id)
  WH->>WH: validate signature + IP allowlist
  WH->>FW: GET /transactions/:id/verify (server-to-server)
  FW-->>WH: status, amount, currency, tx_ref
  WH->>DB: rpc payment_verify_and_finalize(tx_ref)
  DB->>DB: mark payment verified, order paid
  DB->>DB: post balanced ledger transaction (90/10)
  DB->>DB: grant entitlements
  DB-->>WH: ok (idempotent)
  WH-->>FW: 200

  B->>W: GET /api/checkout/status?order=...
  W->>DB: read order + payment
  W-->>B: "Paid — your library is ready"
```

A polling page and a scheduled reconciliation job both call the **same**
server-side verification path, so a missed webhook cannot lose a sale and a
forged redirect cannot create one.

---

## 9. Relationship reference table

| Parent | Child | Cardinality | On delete |
| --- | --- | --- | --- |
| `auth.users` | `profiles` | 1 : 1 | restrict |
| `profiles` | `author_profiles` | 1 : 0..1 | restrict |
| `profiles` | `author_applications` | 1 : 0..n | cascade |
| `author_profiles` | `books` | 1 : 0..n | restrict |
| `categories` | `books` | 1 : 0..n | restrict |
| `books` | `book_formats` | 1 : 1..n | cascade |
| `book_formats` | `book_prices` | 1 : 1..n (one per currency) | cascade |
| `books` | `book_files` | 1 : 0..n | cascade |
| `books` | `book_moderation_events` | 1 : 0..n | cascade |
| `books` | `book_contributors` | 1 : 0..n | cascade |
| `profiles` | `orders` | 1 : 0..n | restrict |
| `orders` | `order_items` | 1 : 1..n | cascade |
| `orders` | `payments` | 1 : 0..n (retries allowed) | restrict |
| `payments` | `refunds` | 1 : 0..n | restrict |
| `payments` | `payment_events` | 1 : 0..n (by reference) | — |
| `orders` | `entitlements` | 1 : 0..n | set null |
| `ledger_transactions` | `ledger_entries` | 1 : 2..n (always balanced) | restrict |
| `author_profiles` | `withdrawals` | 1 : 0..n | restrict |
| `payout_accounts` | `withdrawals` | 1 : 0..n | restrict |
| `withdrawals` | `withdrawal_events` | 1 : 0..n | cascade |
| `entitlements` | `download_events` | 1 : 0..n | set null |

Every `restrict` above is intentional: financial and ownership records are never
silently deleted by a cascade.
