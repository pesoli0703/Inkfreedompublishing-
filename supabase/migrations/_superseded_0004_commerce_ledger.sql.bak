-- 0004 Commerce, payments, entitlements, ledger, withdrawals, content tables
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

create sequence private.order_number_seq start 1000;

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,
  reader_id             uuid not null references public.profiles(id) on delete restrict,
  status                public.order_status not null default 'draft',
  currency              char(3) not null references public.currencies(code),
  subtotal_minor        bigint not null default 0 check (subtotal_minor >= 0),
  shipping_minor        bigint not null default 0 check (shipping_minor >= 0),
  tax_minor             bigint not null default 0 check (tax_minor >= 0),
  discount_minor        bigint not null default 0 check (discount_minor >= 0),
  total_minor           bigint not null default 0 check (total_minor >= 0),
  commission_base_minor bigint not null default 0 check (commission_base_minor >= 0),
  fx_rate_to_base       numeric(18,8) not null default 1 check (fx_rate_to_base > 0),
  base_currency         char(3) not null default 'NGN' references public.currencies(code),
  base_total_minor      bigint,
  email                 citext not null,
  ship_to               jsonb,
  coupon_code           text,
  notes                 text,
  placed_at             timestamptz,
  paid_at               timestamptz,
  fulfilled_at          timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint orders_total_consistent check (total_minor = subtotal_minor + shipping_minor + tax_minor - discount_minor),
  constraint orders_commission_base_within_subtotal check (commission_base_minor <= subtotal_minor),
  constraint orders_paid_has_timestamp check (status not in ('paid','fulfilled','partially_refunded','refunded') or paid_at is not null)
);
create index orders_reader_idx on public.orders (reader_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  book_id           uuid not null references public.books(id) on delete restrict,
  book_format_id    uuid not null references public.book_formats(id) on delete restrict,
  author_id         uuid not null references public.author_profiles(id) on delete restrict,
  title_snapshot    text not null,
  author_snapshot   text not null,
  format_snapshot   public.book_format not null,
  currency          char(3) not null references public.currencies(code),
  unit_price_minor  bigint not null check (unit_price_minor >= 0),
  quantity          integer not null default 1 check (quantity between 1 and 20),
  line_total_minor  bigint generated always as (unit_price_minor * quantity) stored,
  is_commissionable boolean not null default true,
  commission_bps    integer not null check (commission_bps between 0 and 10000),
  price_source      text not null default 'catalogue' check (price_source in ('catalogue','fx_converted','admin_override')),
  fx_rate_used      numeric(18,8),
  created_at        timestamptz not null default now(),
  unique (order_id, book_format_id)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_author_idx on public.order_items (author_id);

create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references public.orders(id) on delete restrict,
  provider                 text not null default 'mock',
  provider_tx_ref          text not null,
  provider_transaction_id  text,
  status                   public.payment_status not null default 'initiated',
  currency                 char(3) not null references public.currencies(code),
  amount_minor             bigint not null check (amount_minor > 0),
  channel                  text,
  payer_email              citext,
  gateway_fee_minor        bigint,
  settlement_amount_minor  bigint,
  settlement_currency      char(3) references public.currencies(code),
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
  constraint payments_success_requires_server_verification check (
    status not in ('succeeded','refunded','partially_refunded')
    or (verified_at is not null and verification_source is not null
        and verified_amount_minor is not null and verified_currency is not null)
  ),
  constraint payments_verified_amount_positive check (verified_amount_minor is null or verified_amount_minor > 0)
);
create index payments_order_idx on public.payments (order_id);
create unique index payments_one_success on public.payments (order_id) where status = 'succeeded';
create trigger payments_touch before update on public.payments
  for each row execute function private.set_updated_at();

create table public.payment_events (
  id                bigserial primary key,
  provider          text not null,
  provider_event_id text not null,
  event_type        text not null,
  signature_valid   boolean not null,
  payload           jsonb not null,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received','ignored','processed','failed')),
  error             text,
  unique (provider, provider_event_id)
);
create trigger payment_events_immutable before update or delete on public.payment_events
  for each row execute function private.reject_mutation();

create table public.refunds (
  id                 uuid primary key default gen_random_uuid(),
  payment_id         uuid not null references public.payments(id) on delete restrict,
  order_id           uuid not null references public.orders(id) on delete restrict,
  amount_minor       bigint not null check (amount_minor > 0),
  currency           char(3) not null references public.currencies(code),
  status             text not null default 'requested' check (status in ('requested','processing','succeeded','failed')),
  reason             text not null,
  provider_refund_id text unique,
  requested_by       uuid references public.profiles(id),
  approved_by        uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  completed_at       timestamptz,
  failure_reason     text
);

create table public.entitlements (
  id            uuid primary key default gen_random_uuid(),
  reader_id     uuid not null references public.profiles(id) on delete restrict,
  book_id       uuid not null references public.books(id) on delete restrict,
  order_id      uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  kind          public.entitlement_kind not null default 'digital',
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  revoke_reason text,
  unique (reader_id, book_id, kind)
);
create index entitlements_library_idx on public.entitlements (reader_id, granted_at desc) where revoked_at is null;

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

create table public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           citext not null unique,
  description    text,
  type           public.coupon_type not null,
  value          bigint not null check (value > 0),
  currency       char(3) references public.currencies(code),
  min_order_minor bigint not null default 0,
  max_redemptions integer,
  times_redeemed integer not null default 0,
  starts_at      timestamptz not null default now(),
  ends_at        timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons(id) on delete restrict,
  order_id   uuid not null references public.orders(id) on delete cascade,
  reader_id  uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

create table public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  reader_id  uuid not null references public.profiles(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reader_id, book_id)
);

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books(id) on delete cascade,
  reader_id  uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  title      text,
  body       text,
  status     public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, reader_id)
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text,
  link       text,
  email_sent boolean not null default false,
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  category   text not null default 'general',
  status     public.support_status not null default 'open',
  order_id   uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id         bigserial primary key,
  ticket_id  uuid not null references public.support_tickets(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete restrict,
  is_staff   boolean not null default false,
  body       text not null,
  created_at timestamptz not null default now()
);

create table public.copyright_reports (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid references public.books(id) on delete set null,
  reporter_name text not null,
  reporter_email citext not null,
  claimant      text,
  claim         text not null,
  status        public.copyright_status not null default 'received',
  resolution    text,
  handled_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.withdrawals (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references public.author_profiles(id) on delete restrict,
  payout_account_id     uuid references public.payout_accounts(id) on delete restrict,
  requested_by          uuid not null references public.profiles(id),
  amount_minor          bigint not null check (amount_minor > 0),
  currency              char(3) not null references public.currencies(code),
  status                public.withdrawal_status not null default 'requested',
  ledger_transaction_id uuid,
  failure_reason        text,
  requested_at          timestamptz not null default now(),
  reviewed_by           uuid references public.profiles(id),
  reviewed_at           timestamptz,
  approved_at           timestamptz,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint withdrawals_approved_has_reviewer
    check (status not in ('approved','processing','paid') or (reviewed_by is not null and approved_at is not null))
);
create index withdrawals_author_idx on public.withdrawals (author_id, created_at desc);
create index withdrawals_queue_idx on public.withdrawals (status, requested_at)
  where status in ('requested','under_review','approved','processing');
create trigger withdrawals_touch before update on public.withdrawals
  for each row execute function private.set_updated_at();

create table public.withdrawal_events (
  id            bigserial primary key,
  withdrawal_id uuid not null references public.withdrawals(id) on delete cascade,
  from_status   public.withdrawal_status,
  to_status     public.withdrawal_status not null,
  actor_id      uuid references public.profiles(id),
  note          text,
  created_at    timestamptz not null default now()
);
create trigger withdrawal_events_immutable before update or delete on public.withdrawal_events
  for each row execute function private.reject_mutation();

create table public.payout_records (
  id            uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.withdrawals(id) on delete restrict,
  amount_minor  bigint not null check (amount_minor > 0),
  currency      char(3) not null references public.currencies(code),
  method        text not null default 'manual_bank_transfer',
  reference     text not null,
  status        public.payout_status not null default 'recorded',
  paid_at       timestamptz,
  recorded_by   uuid not null references public.profiles(id),
  notes         text,
  created_at    timestamptz not null default now()
);

create table public.ledger_transactions (
  id              uuid primary key default gen_random_uuid(),
  kind            public.ledger_txn_kind not null,
  order_id        uuid references public.orders(id) on delete restrict,
  payment_id      uuid references public.payments(id) on delete restrict,
  refund_id       uuid references public.refunds(id) on delete restrict,
  withdrawal_id   uuid references public.withdrawals(id) on delete restrict,
  currency        char(3) not null references public.currencies(code),
  base_currency   char(3) not null default 'NGN' references public.currencies(code),
  fx_rate         numeric(18,8) not null default 1 check (fx_rate > 0),
  commission_bps  integer check (commission_bps between 0 and 10000),
  memo            text not null,
  idempotency_key text not null unique,
  created_by      uuid references public.profiles(id),
  system_generated boolean not null default true,
  created_at      timestamptz not null default now()
);
create index ledger_transactions_order_idx on public.ledger_transactions (order_id);
create index ledger_transactions_kind_idx on public.ledger_transactions (kind, created_at desc);

create table public.ledger_entries (
  id                bigserial primary key,
  transaction_id    uuid not null references public.ledger_transactions(id) on delete restrict,
  account_type      public.ledger_account not null,
  author_id         uuid references public.author_profiles(id) on delete restrict,
  direction         public.ledger_direction not null,
  amount_minor      bigint not null check (amount_minor > 0),
  currency          char(3) not null references public.currencies(code),
  base_amount_minor bigint not null default 0 check (base_amount_minor >= 0),
  memo              text,
  created_at        timestamptz not null default now(),
  constraint ledger_author_accounts_have_author check (
    (account_type in ('author_payable','author_reserve') and author_id is not null)
    or account_type not in ('author_payable','author_reserve'))
);
create index ledger_entries_txn_idx on public.ledger_entries (transaction_id);
create index ledger_entries_author_idx on public.ledger_entries (author_id, currency) where author_id is not null;
create trigger ledger_entries_immutable before update or delete on public.ledger_entries
  for each row execute function private.reject_mutation();

create function private.assert_ledger_balanced() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare debits bigint; credits bigint;
begin
  select coalesce(sum(amount_minor) filter (where direction='debit'),0),
         coalesce(sum(amount_minor) filter (where direction='credit'),0)
    into debits, credits
    from public.ledger_entries where transaction_id = new.transaction_id;
  if debits <> credits then
    raise exception 'unbalanced ledger transaction %: debits %, credits %', new.transaction_id, debits, credits
      using errcode = '23514';
  end if;
  return null;
end; $$;
create constraint trigger ledger_entries_balanced after insert on public.ledger_entries
  deferrable initially deferred for each row execute function private.assert_ledger_balanced();

alter table public.withdrawals
  add constraint withdrawals_ledger_fk foreign key (ledger_transaction_id)
  references public.ledger_transactions(id) on delete set null;
