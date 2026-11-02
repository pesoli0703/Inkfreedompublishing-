-- 0001 Foundation, identity, roles, currency configuration.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext   with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('reader','author','admin');
create type public.account_status as enum ('active','suspended','deleted');
create type public.author_status as enum ('applicant','approved','suspended');
create type public.application_status as enum ('pending','approved','rejected','withdrawn');
create type public.book_status as enum ('draft','submitted','changes_requested','approved','published','unpublished','rejected','archived');
create type public.book_format as enum ('paperback','hardcover','ebook');
create type public.file_kind as enum ('ebook','pdf','sample','interior','cover');
create type public.order_status as enum ('draft','pending_payment','paid','fulfilled','cancelled','refunded','partially_refunded','failed','disputed');
create type public.payment_status as enum ('initiated','pending','succeeded','failed','abandoned','refunded','partially_refunded');
create type public.verification_source as enum ('webhook','server_lookup','reconciliation','manual_admin','mock');
create type public.entitlement_kind as enum ('digital','print');
create type public.ledger_account as enum ('payment_clearing','author_payable','platform_revenue','tax_payable','author_reserve','payout_clearing','adjustments');
create type public.ledger_direction as enum ('debit','credit');
create type public.ledger_txn_kind as enum ('sale','refund','chargeback','payout','reserve_hold','reserve_release','adjustment');
create type public.withdrawal_status as enum ('requested','under_review','approved','processing','paid','rejected','failed','cancelled');
create type public.payout_status as enum ('recorded','confirmed','failed');
create type public.support_status as enum ('open','in_progress','resolved','closed');
create type public.copyright_status as enum ('received','under_review','actioned','dismissed');
create type public.review_status as enum ('pending','published','hidden');
create type public.notification_type as enum ('welcome','email_verification','password_reset','author_application_received','author_application_approved','author_application_rejected','book_submitted','book_approved','book_rejected','book_changes_requested','book_published','payment_succeeded','payment_failed','purchase','withdrawal_requested','withdrawal_approved','withdrawal_paid','support_reply','system');
create type public.coupon_type as enum ('percentage','fixed');

-- ---------------------------------------------------------------- helpers
create function private.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

-- True only inside privileged server-side paths (security definer functions set
-- this GUC) or for the PostgREST service role. Never settable by a browser.
create function private.is_privileged() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.privileged', true), 'off') = 'on'
      or coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
$$;

create function private.reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'append-only table: % is not permitted on %', TG_OP, TG_TABLE_NAME using errcode = '42501';
end; $$;

-- ---------------------------------------------------------------- currency
create table public.currencies (
  code                char(3) primary key,
  name                text not null,
  symbol              text,
  minor_unit          smallint not null default 2 check (minor_unit between 0 and 4),
  is_enabled          boolean not null default false,
  provider_supported  boolean not null default false,
  settlement_currency char(3),
  min_amount_minor    bigint check (min_amount_minor is null or min_amount_minor > 0),
  max_amount_minor    bigint check (max_amount_minor is null or max_amount_minor > 0),
  display_order       integer not null default 100,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.currencies add constraint currencies_settlement_fk
  foreign key (settlement_currency) references public.currencies(code);
create trigger currencies_touch before update on public.currencies
  for each row execute function private.set_updated_at();

insert into public.currencies (code, name, symbol, minor_unit, is_enabled, provider_supported, settlement_currency, min_amount_minor, display_order) values
 ('NGN','Nigerian Naira','₦',2,true,true,'NGN',10000,10),
 ('USD','US Dollar','$',2,true,false,'NGN',100,20),
 ('GBP','Pound Sterling','£',2,true,false,'NGN',100,30),
 ('EUR','Euro','€',2,true,false,'NGN',100,40),
 ('GHS','Ghanaian Cedi','₵',2,false,false,'GHS',100,50),
 ('KES','Kenyan Shilling','KSh',2,false,false,'KES',100,60),
 ('ZAR','South African Rand','R',2,false,false,'ZAR',100,70),
 ('CAD','Canadian Dollar','CA$',2,false,false,'NGN',100,80);

create table public.fx_rates (
  id           bigserial primary key,
  base_code    char(3) not null references public.currencies(code),
  quote_code   char(3) not null references public.currencies(code),
  rate         numeric(18,8) not null check (rate > 0),
  source       text not null,
  fetched_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  check (base_code <> quote_code)
);
create index fx_rates_lookup_idx on public.fx_rates (base_code, quote_code, fetched_at desc);

create table public.platform_settings (
  id                      boolean primary key default true check (id),
  platform_fee_bps        integer not null default 1000 check (platform_fee_bps between 0 and 5000),
  base_currency           char(3) not null default 'NGN' references public.currencies(code),
  payout_minimum_minor    bigint not null default 500000 check (payout_minimum_minor >= 0),
  reserve_hold_days       integer not null default 7 check (reserve_hold_days between 0 and 90),
  refund_window_days      integer not null default 14 check (refund_window_days between 0 and 90),
  download_url_ttl_seconds integer not null default 604800 check (download_url_ttl_seconds between 60 and 604800),
  payments_mode           text not null default 'disabled' check (payments_mode in ('disabled','mock','flutterwave_sandbox','flutterwave_live')),
  price_rounding          text not null default 'psychological' check (price_rounding in ('none','nearest_unit','psychological')),
  legal_brand_name        text not null default 'INKFREEDOMPUBLISHING',
  legal_parent_name       text not null default 'PEACE-TECH MULTIBIZ COMMUNICATIONS',
  legal_registration_type text not null default 'Business Name',
  legal_registration_no   text,
  legal_tin               text,
  legal_address           text,
  support_email           text,
  updated_at              timestamptz not null default now()
);
create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function private.set_updated_at();
insert into public.platform_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------- identity
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete restrict,
  role               public.app_role not null default 'reader',
  status             public.account_status not null default 'active',
  email              citext,
  full_name          text,
  display_name       text,
  avatar_path        text,
  phone              text,
  country_code       char(2),
  preferred_currency char(3) not null default 'NGN' references public.currencies(code),
  marketing_opt_in   boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'reader';
create index profiles_email_idx on public.profiles (email);
create trigger profiles_touch before update on public.profiles
  for each row execute function private.set_updated_at();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin' and p.status = 'active');
$$;

create table public.author_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  full_name      text not null,
  pen_name       text not null,
  email          citext not null,
  biography      text not null,
  country_code   char(2) not null,
  photo_path     text,
  publishing_interests text[] not null default '{}',
  author_details text,
  writing_in     text,
  status         public.application_status not null default 'pending',
  decided_by     uuid references public.profiles(id),
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index author_applications_one_open on public.author_applications (user_id) where status = 'pending';
create index author_applications_status_idx on public.author_applications (status, created_at);
create trigger author_applications_touch before update on public.author_applications
  for each row execute function private.set_updated_at();

create table public.author_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete restrict,
  slug            citext not null unique,
  pen_name        text not null,
  tagline         text,
  bio             text,
  based_in        text,
  country_code    char(2),
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
  constraint author_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create trigger author_profiles_touch before update on public.author_profiles
  for each row execute function private.set_updated_at();

create function public.current_author_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id from public.author_profiles a
  join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid() and p.status = 'active' and a.status = 'approved';
$$;

create table public.payout_accounts (
  id                     uuid primary key default gen_random_uuid(),
  author_id              uuid not null references public.author_profiles(id) on delete cascade,
  provider               text not null default 'manual',
  account_name           text not null,
  bank_name              text not null,
  bank_code              text,
  account_last4          char(4) not null,
  provider_recipient_ref text,
  currency               char(3) not null references public.currencies(code),
  is_default             boolean not null default false,
  is_verified            boolean not null default false,
  created_at             timestamptz not null default now(),
  deleted_at             timestamptz
);
create unique index payout_accounts_one_default on public.payout_accounts (author_id)
  where is_default and deleted_at is null;

create table public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references public.profiles(id),
  actor_role   public.app_role,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  before_state jsonb,
  after_state  jsonb,
  request_id   text,
  created_at   timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function private.reject_mutation();

create function private.write_audit(p_action text, p_entity_type text, p_entity_id text,
                                   p_before jsonb default null, p_after jsonb default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role public.app_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, before_state, after_state)
  values (auth.uid(), v_role, p_action, p_entity_type, p_entity_id, p_before, p_after);
end; $$;

-- profile bootstrap
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, full_name, display_name)
  values (new.id, new.email,
          nullif(new.raw_user_meta_data ->> 'full_name', ''),
          nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- privilege guard: role/status only changeable by privileged server paths
create function private.guard_profile_privileges() returns trigger
language plpgsql as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not private.is_privileged() then
    raise exception 'role and account status are managed by the platform' using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger profiles_guard_privileges before update on public.profiles
  for each row execute function private.guard_profile_privileges();

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_author_id() to authenticated;
revoke all on schema private from anon, authenticated;
