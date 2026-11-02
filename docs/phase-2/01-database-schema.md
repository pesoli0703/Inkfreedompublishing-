# 01 — Database schema

Postgres 15+ on Supabase. This document is the authoritative schema proposal.
**None of this SQL has been applied.** DDL is shown so it can be reviewed line by
line before it becomes a migration.

---

## 1. Conventions

| Convention | Rule |
| --- | --- |
| Naming | `snake_case`, plural table names, `_id` for foreign keys |
| Primary keys | `uuid` via `gen_random_uuid()` for user-facing rows; `bigserial` for append-only event logs |
| Timestamps | `timestamptz`, `created_at default now()`, `updated_at` maintained by trigger |
| Money | `bigint` **minor units** + `char(3)` ISO-4217 currency. Never `float`. Never a bare number without currency |
| Soft delete | `deleted_at timestamptz` on catalogue and address tables only; ledgers and orders are never deleted |
| PII | Kept to the minimum needed; no bank account numbers, no card data ever |
| Ownership | `author_id` references `author_profiles(id)`, not `profiles(id)`, so catalogue ownership and account ownership cannot drift |
| Enums | Postgres enums for closed state sets; `text` + `CHECK` for sets likely to grow |
| RLS | Enabled on **every** table in `public`; no policy means deny |

Schema layout:

- `public` — everything the application touches.
- `storage` — Supabase-managed; accessed only through the download function.
- `auth` — Supabase-managed; only `auth.users.id` is referenced.

### Creation order (matters for foreign keys)

```text
currencies → profiles → categories → author_profiles → author_applications
→ payout_accounts → platform_settings → fx_rates
→ books → book_files → book_formats → book_prices → book_moderation_events
→ book_contributors → reader_addresses → withdrawals → withdrawal_events
→ orders → order_items → payments → payment_events → refunds
→ ledger_transactions → ledger_entries → entitlements → download_events
→ audit_log → views & functions
```

`ledger_transactions.withdrawal_id` references `withdrawals`, so payouts are
created before the ledger. Every migration lands in this order; the numbering in
[07-implementation-sequence.md](./07-implementation-sequence.md) follows it.

Extensions: `pgcrypto` (UUIDs, digests), `citext` (case-insensitive slugs/emails).

```sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext   with schema extensions;
create schema if not exists private;   -- helper functions, not exposed via the API
```

---

## 2. Enum types

```sql
create type public.app_role as enum ('reader', 'author', 'admin');

create type public.account_status as enum ('active', 'suspended', 'deleted');

create type public.author_status as enum ('applicant', 'approved', 'suspended');

create type public.book_status as enum (
  'draft',                -- author is writing it
  'submitted',            -- in the moderation queue
  'changes_requested',    -- editor returned it to the author
  'approved',             -- cleared for publication
  'published',            -- live on the marketplace
  'unpublished',          -- was live, now withheld
  'rejected',             -- not proceeding
  'archived'              -- retired, kept for order history
);

create type public.book_format as enum ('paperback', 'hardcover', 'ebook');

create type public.file_kind as enum ('ebook', 'pdf', 'sample', 'interior', 'cover');

create type public.order_status as enum (
  'draft', 'pending_payment', 'paid', 'fulfilled',
  'cancelled', 'refunded', 'partially_refunded', 'failed', 'disputed'
);

create type public.payment_status as enum (
  'initiated', 'pending', 'succeeded', 'failed',
  'abandoned', 'refunded', 'partially_refunded'
);

create type public.verification_source as enum (
  'webhook', 'server_lookup', 'reconciliation', 'manual_admin'
);

create type public.entitlement_kind as enum ('digital', 'print');

create type public.ledger_account as enum (
  'payment_clearing',   -- money owed to us by the provider, not yet settled
  'author_payable',     -- liability to the author (their 90%)
  'platform_revenue',   -- our 10%
  'tax_payable',        -- VAT / sales tax collected
  'author_reserve',     -- held back during the refund window
  'payout_clearing',    -- money in transit to an author's bank
  'adjustments'         -- manual corrections, always with a reason
);

create type public.ledger_direction as enum ('debit', 'credit');

create type public.ledger_txn_kind as enum (
  'sale', 'refund', 'chargeback', 'payout',
  'reserve_hold', 'reserve_release', 'adjustment'
);

create type public.withdrawal_status as enum (
  'requested', 'under_review', 'approved', 'processing',
  'paid', 'rejected', 'failed', 'cancelled'
);

create type public.application_status as enum (
  'pending', 'approved', 'rejected', 'withdrawn'
);
```

---

## 3. Reference & platform tables

### 3.1 Currencies

Multi-currency is driven by data, not by hard-coded columns. A currency becomes
usable only after an administrator enables it *and* the payment provider has been
verified to support it (see rule 9 in
[05-payments-and-commissions.md](./05-payments-and-commissions.md)).

```sql
create table public.currencies (
  code                char(3) primary key,          -- ISO 4217, upper case
  name                text not null,
  symbol              text,
  minor_unit          smallint not null default 2 check (minor_unit between 0 and 4),
  is_enabled          boolean not null default false,
  provider_supported  boolean not null default false,
  settlement_currency char(3) references public.currencies(code),
  min_amount_minor    bigint check (min_amount_minor is null or min_amount_minor > 0),
  max_amount_minor    bigint check (max_amount_minor is null or max_amount_minor > 0),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint currencies_amount_range
    check (min_amount_minor is null or max_amount_minor is null or min_amount_minor <= max_amount_minor)
);

-- Seeds the row shape only. Values are set by an administrator, not by a migration.
insert into public.currencies (code, name, symbol, minor_unit, is_enabled, provider_supported, settlement_currency)
values ('NGN', 'Nigerian Naira', '₦', 2, true,  true,  'NGN'),
       ('USD', 'US Dollar',     '$', 2, false, false, 'NGN'),
       ('GBP', 'Pound Sterling','£', 2, false, false, 'NGN'),
       ('GHS', 'Ghanaian Cedi', '₵', 2, false, false, 'GHS'),
       ('KES', 'Kenyan Shilling','KSh', 2, false, false, 'KES'),
       ('ZAR', 'South African Rand', 'R', 2, false, false, 'ZAR')
on conflict (code) do nothing;
```

> `provider_supported = true` for NGN reflects the intended launch currency only.
> It is set to `true` here as the *assumption to validate* in sandbox; nothing is
> charged until a live key is approved.

### 3.2 FX rates

Needed for consolidated reporting in one base currency and, later, for
converted pricing. Rates are stored, never computed from today's value at report
time.

```sql
create table public.fx_rates (
  id           bigserial primary key,
  base_code    char(3) not null references public.currencies(code),  -- e.g. USD
  quote_code   char(3) not null references public.currencies(code),  -- e.g. NGN
  rate         numeric(18, 8) not null check (rate > 0),             -- 1 base = rate quote
  source       text not null default 'manual',
  effective_at timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  unique (base_code, quote_code, effective_at),
  check (base_code <> quote_code)
);
```

### 3.3 Platform settings

A single row, admin-only. Holds the commission rule, base currency, payout policy
and the legal-entity details printed on receipts.

```sql
create table public.platform_settings (
  id                     boolean primary key default true check (id),
  platform_fee_bps       integer not null default 1000  check (platform_fee_bps between 0 and 5000),
  author_share_bps       integer generated always as (10000 - platform_fee_bps) stored,
  base_currency          char(3) not null default 'NGN' references public.currencies(code),
  payout_minimum_minor   bigint  not null default 500000 check (payout_minimum_minor >= 0),
  reserve_hold_days      integer not null default 7 check (reserve_hold_days between 0 and 90),
  refund_window_days     integer not null default 14 check (refund_window_days between 0 and 90),
  -- Legal entity, for invoices and receipts. Supplied by the business, never invented.
  legal_brand_name       text not null default 'INKFREEDOMPUBLISHING',
  legal_parent_name      text not null default 'PEACE-TECH MULTIBIZ COMMUNICATIONS',
  legal_registration_type text not null default 'Business Name',
  legal_registration_no  text,      -- to be supplied
  legal_tin              text,      -- to be supplied
  legal_address          text,      -- to be supplied
  support_email          text,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references public.profiles(id)
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
```

> The business is a **Business Name** trading as INKFREEDOMPUBLISHING under
> PEACE-TECH MULTIBIZ COMMUNICATIONS. Registration number, TIN and registered
> address are deliberately left `NULL` — they must be supplied by you, not
> invented. Receipts render these only when non-null.

---

## 4. Identity, roles & author onboarding

### 4.1 Profiles

```sql
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete restrict,
  role                public.app_role not null default 'reader',
  status              public.account_status not null default 'active',
  full_name           text,
  display_name        text,
  avatar_path         text,
  phone               text,
  preferred_currency  char(3) not null default 'NGN' references public.currencies(code),
  marketing_opt_in    boolean not null default false,
  last_seen_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint profiles_display_name_len
    check (display_name is null or char_length(display_name) between 1 and 80)
);

create index profiles_role_idx on public.profiles (role) where role <> 'reader';
```

**Trigger — profile creation.** Identity is never created by the client:

```sql
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
```

**Trigger — privilege guard.** Even a bug in an API route cannot silently promote
an account: role changes are rejected unless the statement runs as the service
role (which bypasses RLS and is only used by audited server code).

```sql
create function private.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role <> old.role and current_setting('role', true) <> 'service_role' then
    raise exception 'role changes are restricted to the service role'
      using errcode = '42501';
  end if;
  if new.status <> old.status and current_setting('role', true) <> 'service_role' then
    raise exception 'account status changes are restricted to the service role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function private.guard_profile_role();
```

### 4.2 Author applications

Author status is earned, not chosen. This table is the audit trail of how a reader
became an author.

```sql
create table public.author_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  pen_name       text not null,
  writing_in     text,
  bio            text,
  sample_note    text,                       -- description of the manuscript offered
  sample_file    text,                       -- private storage path, nullable
  status         public.application_status not null default 'pending',
  decided_by     uuid references public.profiles(id),
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now(),
  constraint author_applications_bio_len check (bio is null or char_length(bio) <= 2000)
);

-- Only one open application per user.
create unique index author_applications_one_open
  on public.author_applications (user_id)
  where status = 'pending';
```

### 4.3 Author profiles

```sql
create table public.author_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete restrict,
  slug            citext not null unique,
  pen_name        text not null,
  tagline         text,
  bio             text,
  based_in        text,
  writing_in      text,
  avatar_path     text,
  status          public.author_status not null default 'applicant',
  payout_currency char(3) not null default 'NGN' references public.currencies(code),
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  suspended_at    timestamptz,
  suspension_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint author_profiles_pen_name_len check (char_length(pen_name) between 1 and 80),
  constraint author_profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index author_profiles_status_idx on public.author_profiles (status);
```

### 4.4 Payout accounts

No raw bank account numbers are stored. The provider issues a recipient/beneficiary
token, and we keep the token plus a masked display value.

```sql
create table public.payout_accounts (
  id                     uuid primary key default gen_random_uuid(),
  author_id              uuid not null references public.author_profiles(id) on delete cascade,
  provider               text not null default 'flutterwave',
  account_name           text not null,
  bank_code              text not null,
  account_last4          char(4) not null,
  provider_recipient_ref text,                -- token/id returned by the provider
  currency               char(3) not null references public.currencies(code),
  is_default             boolean not null default false,
  is_verified            boolean not null default false,
  created_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  unique (author_id, provider, provider_recipient_ref)
);

create unique index payout_accounts_one_default
  on public.payout_accounts (author_id)
  where is_default and deleted_at is null;
```

---

## 5. Catalogue

### 5.1 Categories

```sql
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  blurb       text,
  note        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
```

### 5.2 Books

```sql
create table public.books (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references public.author_profiles(id) on delete restrict,
  category_id           uuid not null references public.categories(id) on delete restrict,
  slug                  citext not null unique,
  title                 text not null,
  subtitle              text,
  hook                  text not null,                 -- one-sentence card line
  description_paragraphs text[] not null default '{}',
  excerpt_label         text,
  excerpt_body          text[] not null default '{}',
  themes                text[] not null default '{}',
  language              text not null default 'English',
  page_count            integer check (page_count is null or page_count > 0),
  cover_path            text,
  status                public.book_status not null default 'draft',
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.profiles(id),
  review_note           text,
  published_at          timestamptz,
  unpublished_at        timestamptz,
  is_featured           boolean not null default false,
  featured_rank         integer,
  search_vector         tsvector generated always as (
                          setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                          setweight(to_tsvector('simple', coalesce(subtitle, '') || ' ' || coalesce(hook, '')), 'B') ||
                          setweight(to_tsvector('simple', array_to_string(themes, ' ')), 'C')
                        ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint books_title_len  check (char_length(title) between 1 and 200),
  constraint books_hook_len   check (char_length(hook) between 1 and 400),
  constraint books_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint books_published_requires_date
    check (status <> 'published' or published_at is not null)
);

create index books_author_idx      on public.books (author_id);
create index books_category_idx    on public.books (category_id);
create index books_status_idx      on public.books (status) where deleted_at is null;
create index books_search_idx      on public.books using gin (search_vector);
create index books_published_idx   on public.books (published_at desc)
  where status = 'published' and deleted_at is null;
create index books_featured_idx    on public.books (featured_rank)
  where is_featured and status = 'published';
```

**Status machine guard.** Transitions are validated in the database, so no client
can move a book straight to `published`:

```sql
create function private.enforce_book_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean := false;
  is_service boolean := current_setting('role', true) = 'service_role';
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := case old.status
    when 'draft'             then new.status in ('submitted', 'archived')
    when 'submitted'         then new.status in ('approved', 'changes_requested', 'rejected')
    when 'changes_requested' then new.status in ('submitted', 'draft', 'archived')
    when 'approved'          then new.status in ('published', 'unpublished', 'archived')
    when 'published'         then new.status in ('unpublished', 'archived')
    when 'unpublished'       then new.status in ('published', 'archived')
    when 'rejected'          then new.status in ('draft', 'archived')
    when 'archived'          then false
  end;

  if not allowed then
    raise exception 'illegal book transition % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  -- Only privileged server code (admin actions run as service role) may approve,
  -- reject, publish, unpublish or archive. Authors may only submit or withdraw.
  if not is_service and new.status not in ('submitted', 'draft', 'archived') then
    raise exception 'status change to % requires administrator action', new.status
      using errcode = '42501';
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'unpublished' then
    new.unpublished_at := now();
  end if;
  return new;
end;
$$;

create trigger books_status_guard
  before update of status on public.books
  for each row execute function private.enforce_book_transition();
```

### 5.3 Book formats and prices

A format exists once per book; a price exists once per format per enabled currency.

```sql
create table public.book_formats (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.books(id) on delete cascade,
  format          public.book_format not null,
  is_available    boolean not null default false,
  sku             text unique,
  stock_on_hand   integer check (stock_on_hand is null or stock_on_hand >= 0),
  file_id         uuid,                    -- FK added after book_files exists
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (book_id, format)
);

create table public.book_prices (
  id              uuid primary key default gen_random_uuid(),
  book_format_id  uuid not null references public.book_formats(id) on delete cascade,
  currency        char(3) not null references public.currencies(code),
  price_minor     bigint not null check (price_minor >= 0),
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  unique (book_format_id, currency)
);

create index book_prices_currency_idx on public.book_prices (currency) where is_active;

-- A format cannot be offered for sale without an active price in the base
-- currency. This is a cross-row rule, so it is asserted inside the submission
-- checklist (see §9) rather than with a trigger, because prices are typically
-- inserted after the formats that hold them.
create function private.assert_format_pricing(p_book_id uuid)
returns text[]                       -- returns the list of failing formats
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(f.format::text) filter (where p.id is null), '{}')
  from public.book_formats f
  left join public.book_prices p
    on p.book_format_id = f.id
   and p.is_active
   and p.currency = (select base_currency from public.platform_settings where id)
  where f.book_id = p_book_id
    and f.is_available;
$$;
```

### 5.4 Book files (private assets)

Every binary is described here. The object itself lives in a private bucket
(documented in [04-storage-architecture.md](./04-storage-architecture.md)).

```sql
create table public.book_files (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.books(id) on delete cascade,
  kind            public.file_kind not null,
  format          public.book_format,             -- null for cover/sample
  storage_bucket  text not null default 'book-files',
  storage_path    text not null unique,           -- never exposed to clients
  mime_type       text not null,
  size_bytes      bigint not null check (size_bytes between 1 and 209715200), -- 200 MB
  checksum_sha256 text not null,
  version         integer not null default 1 check (version > 0),
  is_current      boolean not null default true,
  uploaded_by     uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (book_id, kind, format, version),
  constraint book_files_bucket_allowed
    check (storage_bucket in ('book-files', 'book-samples', 'book-covers')),
  constraint book_files_digital_kind
    check (kind not in ('ebook', 'pdf', 'interior') or format is not null)
);

create index book_files_book_idx on public.book_files (book_id) where is_current;

alter table public.book_formats
  add constraint book_formats_file_fk
  foreign key (file_id) references public.book_files(id) on delete set null;
```

### 5.5 Moderation history

Append-only record of every decision, so "who approved this and when" is always
answerable.

```sql
create table public.book_moderation_events (
  id          bigserial primary key,
  book_id     uuid not null references public.books(id) on delete cascade,
  from_status public.book_status,
  to_status   public.book_status not null,
  action      text not null,                 -- submitted | approved | rejected | changes_requested | published | unpublished
  actor_id    uuid not null references public.profiles(id),
  actor_role  public.app_role not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index book_moderation_book_idx on public.book_moderation_events (book_id, created_at desc);
```

### 5.6 Contributors (co-authors, translators, illustrators)

Informational in v1: revenue is attributed to the primary author. The table exists
so multi-author books are modelled from day one without a migration later.

```sql
create table public.book_contributors (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references public.books(id) on delete cascade,
  author_id     uuid references public.author_profiles(id),
  display_name  text not null,
  role          text not null check (role in ('co_author', 'translator', 'illustrator', 'editor')),
  sort_order    integer not null default 0,
  unique (book_id, display_name, role)
);
```

---

## 6. Commerce

### 6.1 Addresses

```sql
create table public.reader_addresses (
  id             uuid primary key default gen_random_uuid(),
  reader_id      uuid not null references public.profiles(id) on delete cascade,
  label          text,
  recipient_name text not null,
  phone          text not null,
  line1          text not null,
  line2          text,
  city           text not null,
  state_region   text,
  postal_code    text,
  country_code   char(2) not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
```

### 6.2 Orders

Totals are computed **server-side** and enforced by a check constraint. Shipping
address is snapshotted as JSON because address rows may later be edited or deleted.

```sql
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,          -- e.g. IFP-2026-000137
  reader_id             uuid not null references public.profiles(id) on delete restrict,
  status                public.order_status not null default 'draft',
  currency              char(3) not null references public.currencies(code),
  subtotal_minor        bigint not null default 0 check (subtotal_minor >= 0),
  shipping_minor        bigint not null default 0 check (shipping_minor >= 0),
  tax_minor             bigint not null default 0 check (tax_minor >= 0),
  discount_minor        bigint not null default 0 check (discount_minor >= 0),
  total_minor           bigint not null default 0 check (total_minor >= 0),
  commission_base_minor bigint not null default 0 check (commission_base_minor >= 0),
  fx_rate_to_base       numeric(18, 8) not null default 1 check (fx_rate_to_base > 0),
  base_currency         char(3) not null references public.currencies(code),
  base_total_minor      bigint,
  email                 citext not null,
  ship_to               jsonb,                          -- snapshot for physical items
  notes                 text,
  placed_at             timestamptz,
  paid_at               timestamptz,
  fulfilled_at          timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint orders_total_consistent
    check (total_minor = subtotal_minor + shipping_minor + tax_minor - discount_minor),
  constraint orders_commission_base_within_subtotal
    check (commission_base_minor <= subtotal_minor),
  constraint orders_paid_has_timestamp
    check (status not in ('paid', 'fulfilled') or paid_at is not null)
);

create index orders_reader_idx on public.orders (reader_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
```

`commission_base_minor` excludes shipping and tax (see
[05-payments-and-commissions.md](./05-payments-and-commissions.md)) and is written
by `order_create()` from the resolved items. A deferred constraint trigger
(`orders_recalc_commission_base`) asserts it equals
`sum(order_items.line_total_minor)` for commissionable lines before commit, so the
column cannot drift from its lines.

`order_number` is generated inside `order_create()` from a
`private.order_number_seq` sequence as `IFP-{YYYY}-{6-digit}`; the column is
`UNIQUE`, so a collision is impossible rather than merely unlikely.

### 6.3 Order items

The immutable record of *what was sold, to whom it is owed, and at what rate*.

```sql
create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  book_id            uuid not null references public.books(id) on delete restrict,
  book_format_id     uuid not null references public.book_formats(id) on delete restrict,
  author_id          uuid not null references public.author_profiles(id) on delete restrict,
  title_snapshot     text not null,
  author_snapshot    text not null,
  format_snapshot    public.book_format not null,
  currency           char(3) not null references public.currencies(code),
  unit_price_minor   bigint not null check (unit_price_minor >= 0),
  quantity           integer not null default 1 check (quantity between 1 and 20),
  line_total_minor   bigint generated always as (unit_price_minor * quantity) stored,
  is_commissionable  boolean not null default true,
  commission_bps     integer not null check (commission_bps between 0 and 10000),
  created_at         timestamptz not null default now(),
  unique (order_id, book_format_id)
);

create index order_items_order_idx  on public.order_items (order_id);
create index order_items_author_idx on public.order_items (author_id);
```

### 6.4 Payments

A payment is a record of an attempt. `succeeded` is only reachable with a
verification stamp — the constraint below makes the rule a database invariant,
not a coding convention.

```sql
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references public.orders(id) on delete restrict,
  provider                 text not null default 'flutterwave',
  provider_tx_ref          text not null,        -- reference we generate and send
  provider_transaction_id  text,                 -- id the provider issues
  status                   public.payment_status not null default 'initiated',
  currency                 char(3) not null references public.currencies(code),
  amount_minor             bigint not null check (amount_minor > 0),
  channel                  text,
  payer_email              citext,
  verified_at              timestamptz,
  verification_source      public.verification_source,
  verified_amount_minor    bigint,
  verified_currency        char(3),
  verified_provider_status text,
  reconciliation_attempts  integer not null default 0,
  raw_response             jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, provider_tx_ref),
  unique (provider, provider_transaction_id),
  constraint payments_success_requires_server_verification check (
    status not in ('succeeded', 'refunded', 'partially_refunded')
    or (
      verified_at is not null
      and verification_source is not null
      and verified_amount_minor is not null
      and verified_currency is not null
    )
  ),
  constraint payments_verified_amount_positive
    check (verified_amount_minor is null or verified_amount_minor > 0)
);

create index payments_order_idx on public.payments (order_id);
create index payments_pending_idx
  on public.payments (created_at)
  where status in ('initiated', 'pending');
```

### 6.5 Webhook inbox

Every provider callback is stored raw before processing. This is the audit trail
that makes payment disputes answerable, and it enables idempotent replay.

```sql
create table public.payment_events (
  id                bigserial primary key,
  provider          text not null,
  provider_event_id text not null,
  event_type        text not null,
  signature_valid   boolean not null,
  payload           jsonb not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'ignored', 'processed', 'failed')),
  error             text,
  unique (provider, provider_event_id)
);

create index payment_events_unprocessed_idx
  on public.payment_events (received_at)
  where processing_status in ('received', 'failed');
```

### 6.6 Refunds

```sql
create table public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments(id) on delete restrict,
  order_id           uuid not null references public.orders(id) on delete restrict,
  amount_minor       bigint not null check (amount_minor > 0),
  currency           char(3) not null references public.currencies(code),
  status             text not null default 'requested'
    check (status in ('requested', 'processing', 'succeeded', 'failed')),
  reason             text not null,
  provider_refund_id text unique,
  requested_by       uuid references public.profiles(id),
  approved_by        uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  completed_at       timestamptz,
  failure_reason     text
);
```

---

## 7. Fulfilment & reader library

```sql
create table public.entitlements (
  id             uuid primary key default gen_random_uuid(),
  reader_id      uuid not null references public.profiles(id) on delete restrict,
  book_id        uuid not null references public.books(id) on delete restrict,
  order_id       uuid references public.orders(id) on delete set null,
  order_item_id  uuid references public.order_items(id) on delete set null,
  kind           public.entitlement_kind not null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoke_reason  text,
  unique (reader_id, book_id, kind)
);

create index entitlements_library_idx
  on public.entitlements (reader_id, granted_at desc)
  where revoked_at is null;

create table public.download_events (
  id             bigserial primary key,
  entitlement_id uuid references public.entitlements(id) on delete set null,
  user_id        uuid references public.profiles(id) on delete set null,
  book_file_id   uuid references public.book_files(id) on delete set null,
  ip_hash        text,
  user_agent     text,
  issued_at      timestamptz not null default now(),
  expires_at     timestamptz not null
);

create index download_events_user_idx on public.download_events (user_id, issued_at desc);
```

`download_events` is an audit log, not a limit enforcer; rate limits are applied in
the download function (see doc 04).

---

## 8. Money: ledger, balances, withdrawals

### 8.1 Ledger transactions

```sql
create table public.ledger_transactions (
  id                uuid primary key default gen_random_uuid(),
  kind              public.ledger_txn_kind not null,
  order_id          uuid references public.orders(id) on delete restrict,
  payment_id        uuid references public.payments(id) on delete restrict,
  refund_id         uuid references public.refunds(id) on delete restrict,
  withdrawal_id     uuid references public.withdrawals(id) on delete restrict,
  currency          char(3) not null references public.currencies(code),
  base_currency     char(3) not null references public.currencies(code),
  fx_rate           numeric(18, 8) not null default 1 check (fx_rate > 0),
  commission_bps    integer check (commission_bps between 0 and 10000),
  memo              text not null,
  idempotency_key   text not null unique,      -- e.g. 'sale:pay_01H...' — replays are no-ops
  created_by        uuid references public.profiles(id),
  system_generated  boolean not null default true,
  created_at        timestamptz not null default now()
);

create index ledger_transactions_order_idx on public.ledger_transactions (order_id);
create index ledger_transactions_kind_idx  on public.ledger_transactions (kind, created_at desc);
```

### 8.2 Ledger entries

Append-only. No `updated_at`, no `deleted_at`, no `UPDATE`/`DELETE` grants.

```sql
create table public.ledger_entries (
  id               bigserial primary key,
  transaction_id   uuid not null references public.ledger_transactions(id) on delete restrict,
  account_type     public.ledger_account not null,
  author_id        uuid references public.author_profiles(id) on delete restrict,
  direction        public.ledger_direction not null,
  amount_minor     bigint not null check (amount_minor > 0),
  currency         char(3) not null references public.currencies(code),
  base_amount_minor bigint not null check (base_amount_minor >= 0),
  memo             text,
  created_at       timestamptz not null default now(),
  constraint ledger_entries_author_accounts_have_author
    check (
      (account_type in ('author_payable', 'author_reserve') and author_id is not null)
      or (account_type not in ('author_payable', 'author_reserve'))
    ),
  constraint ledger_entries_amount_positive check (amount_minor > 0)
);

create index ledger_entries_txn_idx    on public.ledger_entries (transaction_id);
create index ledger_entries_author_idx on public.ledger_entries (author_id, currency)
  where author_id is not null;
```

**Immutability trigger** (applies to `ledger_entries`, `book_moderation_events`,
`payment_events`, `audit_log`):

```sql
create function private.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'append-only table: % is not permitted', tg_op
    using errcode = '42501';
end;
$$;

create trigger ledger_entries_immutable
  before update or delete on public.ledger_entries
  for each row execute function private.reject_mutation();
```

**Balance invariant**, checked when the transaction commits rather than per row:

```sql
create function private.assert_ledger_transaction_balanced()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  debits  bigint;
  credits bigint;
begin
  select
    coalesce(sum(amount_minor) filter (where direction = 'debit'), 0),
    coalesce(sum(amount_minor) filter (where direction = 'credit'), 0)
  into debits, credits
  from public.ledger_entries
  where transaction_id = new.transaction_id;

  if debits <> credits then
    raise exception 'unbalanced ledger transaction %: debits %, credits %',
      new.transaction_id, debits, credits
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger ledger_entries_balanced
  after insert on public.ledger_entries
  deferrable initially deferred
  for each row execute function private.assert_ledger_transaction_balanced();
```

### 8.3 Derived balances (never stored, never editable)

```sql
create view public.author_balances
with (security_invoker = true) as
with entries as (
  select e.author_id,
         e.currency,
         sum(case when e.account_type = 'author_payable' and e.direction = 'credit' then e.amount_minor
                  when e.account_type = 'author_payable' and e.direction = 'debit'  then -e.amount_minor
                  else 0 end) as payable_minor,
         sum(case when e.account_type = 'author_reserve' and e.direction = 'credit' then e.amount_minor
                  when e.account_type = 'author_reserve' and e.direction = 'debit'  then -e.amount_minor
                  else 0 end) as reserved_minor
  from public.ledger_entries e
  where e.author_id is not null
  group by e.author_id, e.currency
)
select author_id,
       currency,
       payable_minor,
       reserved_minor,
       payable_minor - reserved_minor as available_minor
from entries;
```

A helper function is used by the withdrawal API to lock the balance:

```sql
create function public.author_available_balance(p_author_id uuid, p_currency char(3))
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select available_minor from public.author_balances
      where author_id = p_author_id and currency = p_currency),
    0);
$$;
```

### 8.4 Withdrawals

```sql
create table public.withdrawals (
  id                     uuid primary key default gen_random_uuid(),
  author_id              uuid not null references public.author_profiles(id) on delete restrict,
  payout_account_id      uuid not null references public.payout_accounts(id) on delete restrict,
  requested_by           uuid not null references public.profiles(id),
  amount_minor           bigint not null check (amount_minor > 0),
  currency               char(3) not null references public.currencies(code),
  status                 public.withdrawal_status not null default 'requested',
  ledger_transaction_id  uuid references public.ledger_transactions(id),
  provider_transfer_ref  text unique,
  failure_reason         text,
  requested_at           timestamptz not null default now(),
  reviewed_by            uuid references public.profiles(id),
  reviewed_at            timestamptz,
  approved_at            timestamptz,
  paid_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint withdrawals_approved_has_reviewer
    check (status not in ('approved', 'processing', 'paid') or (reviewed_by is not null and approved_at is not null))
);

create index withdrawals_author_idx on public.withdrawals (author_id, created_at desc);
create index withdrawals_queue_idx  on public.withdrawals (status, requested_at)
  where status in ('requested', 'under_review', 'approved', 'processing');

create table public.withdrawal_events (
  id            bigserial primary key,
  withdrawal_id uuid not null references public.withdrawals(id) on delete cascade,
  from_status   public.withdrawal_status,
  to_status     public.withdrawal_status not null,
  actor_id      uuid references public.profiles(id),
  note          text,
  created_at    timestamptz not null default now()
);
```

### 8.5 Audit log

```sql
create table public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references public.profiles(id),
  actor_role   public.app_role,
  action       text not null,                 -- e.g. 'book.approve', 'withdrawal.approve'
  entity_type  text not null,
  entity_id    text,
  before_state jsonb,
  after_state  jsonb,
  ip_hash      text,
  request_id   text,
  created_at   timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx  on public.audit_log (actor_id, created_at desc);
```

`audit_log` has the same immutability trigger as the ledger.

---

## 9. Database functions (API surface)

All privileged writes are funnelled through `SECURITY DEFINER` functions with an
explicit `search_path`, so the client never holds broad table privileges.

| Function | Caller | Purpose |
| --- | --- | --- |
| `public.is_admin()` | RLS policies | `true` when `auth.uid()` has role `admin` and status `active` |
| `public.current_author_id()` | RLS policies | `author_profiles.id` for the signed-in user, or `null` |
| `public.author_applications_admin_decide(p_application_id, p_decision, p_note)` | admin | Approve/reject an author application; promotes role, creates `author_profiles`, writes audit |
| `public.books_submit_for_review(p_book_id)` | author | `draft/changes_requested → submitted`, writes moderation event |
| `public.books_moderate(p_book_id, p_decision, p_note)` | admin | `submitted → approved / changes_requested / rejected`, writes event + audit |
| `public.books_set_publication(p_book_id, p_publish boolean)` | admin | `approved ⇄ published ⇄ unpublished`, writes event + audit |
| `public.order_create(p_items jsonb, p_currency char(3), p_email text)` | reader | Resolves live prices server-side, snapshots rate/settings, returns order |
| `public.payment_begin(p_order_id, p_provider)` | reader | Creates `payments` row + provider reference; returns init payload |
| `public.payment_verify_and_finalize(p_provider, p_tx_ref)` | service role | Re-checks provider, marks payment verified, finalises order, posts ledger, grants entitlements — idempotent |
| `public.order_finalize(p_order_id)` | service role | Single transaction: status → paid/fulfilled, entitlements, ledger, notifications |
| `public.refund_record(...)` | admin / service role | Records refund and posts reversing ledger transaction |
| `public.withdrawal_request(p_amount_minor, p_currency, p_account_id)` | author | Validates minimum + available balance under row lock, creates request |
| `public.withdrawal_decide(p_withdrawal_id, p_decision, p_note)` | admin | Approve/reject; on approve posts payout ledger transaction |
| `public.download_authorize(p_book_file_id)` | reader (via Edge Function) | Checks entitlement, returns path + TTL; logs `download_events` |
| `public.author_sales_summary(p_from date, p_to date)` | author | Aggregates own sales, refunds, fees, net earnings |

Payment-critical functions are callable **only** by the service role:

```sql
revoke all on function public.payment_verify_and_finalize(text, text) from public, anon, authenticated;
revoke all on function public.order_finalize(uuid) from public, anon, authenticated;
```

---

## 10. Views for the public catalogue

The storefront reads a view, not the table, so the exposed shape is explicit and
stable while the table gains internal columns.

```sql
create view public.published_books
with (security_invoker = true) as
select b.id, b.slug, b.title, b.subtitle, b.hook,
       b.description_paragraphs, b.excerpt_label, b.excerpt_body, b.themes,
       b.language, b.page_count, b.cover_path, b.is_featured, b.featured_rank,
       b.published_at,
       c.slug as category_slug, c.name as category_name,
       a.id as author_id, a.slug as author_slug, a.pen_name as author_name, a.based_in
from public.books b
join public.categories c on c.id = b.category_id
join public.author_profiles a on a.id = b.author_id
where b.status = 'published'
  and b.deleted_at is null
  and c.is_active
  and a.status = 'approved';

create view public.published_book_offers
with (security_invoker = true) as
select f.id as book_format_id, f.book_id, f.format, f.sku,
       p.currency, p.price_minor
from public.book_formats f
join public.book_prices p on p.book_format_id = f.id and p.is_active
join public.published_books b on b.id = f.book_id
where f.is_available;
```

---

## 11. Grants (defence in depth on top of RLS)

```sql
-- Nothing in public is writable by the anonymous role.
revoke all on all tables in schema public from anon;
grant select on public.published_books, public.published_book_offers,
                public.categories, public.currencies, public.platform_settings
  to anon, authenticated;

-- Authenticated users get SELECT/limited writes; RLS decides the rows.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update, delete on public.ledger_entries, public.audit_log,
                        public.payment_events, public.book_moderation_events
  from authenticated;

-- Helper functions in `private` are not exposed through the API.
revoke all on schema private from anon, authenticated;
```

---

## 12. Data volumes & performance assumptions

| Table | Year-1 assumption | Consequence |
| --- | --- | --- |
| `books` | 300–2,000 rows | Full indexes; no partitioning needed |
| `orders` / `order_items` | 20k–100k rows | Indexed by reader and status; monthly reporting views |
| `payments` | ~1 per checkout attempt | Partial index on pending rows for reconciliation |
| `ledger_entries` | ~3 rows per sold item | Append-only, indexed by author and currency |
| `payment_events` | 1–3 per payment | Retention 24 months, then archive to cold storage |
| `download_events` | highest volume table | Retention 90 days; may later move to a partitioned table |

---

## 13. What is deliberately *not* in this schema

- **Card data** — never stored; the provider hosts the payment form.
- **Raw bank account numbers** — only provider tokens plus `last4`.
- **Passwords / tokens** — Supabase Auth owns these entirely.
- **Derived earnings totals** — computed from the ledger, never cached in a
  writable column (a materialised view can be added later for reporting speed).
- **Testimonials, ratings, review scores** — out of scope for this phase; nothing
  is fabricated in the database either.
