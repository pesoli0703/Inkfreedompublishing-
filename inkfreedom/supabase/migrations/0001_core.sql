-- Inkfreedom · core schema (ebook marketplace)
-- Everything is namespaced with ink_ so it coexists in a shared database.

-- ── Types ──────────────────────────────────────────────────────────────────
do $$ begin create type public.ink_user_role as enum ('reader','author','admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.ink_book_status as enum ('draft','pending','published','rejected');
exception when duplicate_object then null; end $$;
do $$ begin create type public.ink_order_status as enum ('pending','paid','failed','refunded');
exception when duplicate_object then null; end $$;
do $$ begin create type public.ink_payout_status as enum ('requested','approved','paid','rejected');
exception when duplicate_object then null; end $$;
do $$ begin create type public.ink_ebook_format as enum ('pdf','epub');
exception when duplicate_object then null; end $$;

-- ── Profiles ───────────────────────────────────────────────────────────────
create table if not exists public.ink_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.ink_user_role not null default 'reader',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ink_profiles_role_idx on public.ink_profiles(role);

create or replace function public.ink_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.role::text from public.ink_profiles p where p.id = auth.uid()), 'anon');
$$;

create or replace function public.ink_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.ink_app_role() = 'admin';
$$;

create or replace function public.ink_is_author()
returns boolean language sql stable security definer set search_path = public as $$
  select public.ink_app_role() in ('author','admin');
$$;

create or replace function public.ink_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data ->> 'role', 'reader');
begin
  insert into public.ink_profiles (id, email, full_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'full_name',''),
          case when requested = 'author' then 'author'::public.ink_user_role
               else 'reader'::public.ink_user_role end)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ink_on_auth_user_created on auth.users;
create trigger ink_on_auth_user_created after insert on auth.users
  for each row execute function public.ink_handle_new_user();

create or replace function public.ink_guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.ink_is_admin() then
    raise exception 'role changes require an administrator';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ink_profiles_guard_role on public.ink_profiles;
create trigger ink_profiles_guard_role before update on public.ink_profiles
  for each row execute function public.ink_guard_profile_role();

-- ── Authors ────────────────────────────────────────────────────────────────
create table if not exists public.ink_authors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.ink_profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  tagline text,
  bio text,
  website text,
  location text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create index if not exists ink_authors_profile_idx on public.ink_authors(profile_id);

create or replace function public.ink_handle_author_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_slug text; final_slug text; counter int := 0;
begin
  if new.role = 'author' and (old.role is distinct from 'author') then
    base_slug := trim(both '-' from coalesce(nullif(regexp_replace(lower(coalesce(new.full_name, split_part(new.email,'@',1))), '[^a-z0-9]+','-','g'),''), 'author'));
    final_slug := base_slug;
    while exists (select 1 from public.ink_authors a where a.slug = final_slug) loop
      counter := counter + 1;
      final_slug := base_slug || '-' || counter::text;
    end loop;
    insert into public.ink_authors (profile_id, slug, name)
    values (new.id, final_slug, coalesce(nullif(new.full_name,''), split_part(new.email,'@',1)))
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ink_profiles_author_row on public.ink_profiles;
create trigger ink_profiles_author_row after insert or update of role on public.ink_profiles
  for each row execute function public.ink_handle_author_role();

-- ── Books ──────────────────────────────────────────────────────────────────
create table if not exists public.ink_books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.ink_authors(id) on delete cascade,
  title text not null,
  slug text not null unique,
  subtitle text,
  description text not null,
  category text not null default 'Fiction',
  language text not null default 'English',
  price_kobo integer not null check (price_kobo >= 0),
  cover_path text,
  ebook_path text,
  ebook_format public.ink_ebook_format not null default 'pdf',
  ebook_size_bytes bigint,
  pages integer check (pages is null or pages > 0),
  isbn text,
  status public.ink_book_status not null default 'draft',
  review_note text,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ink_books_status_idx on public.ink_books(status);
create index if not exists ink_books_author_idx on public.ink_books(author_id);

create or replace function public.ink_guard_book_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    if not public.ink_is_admin() then
      raise exception 'only an administrator can publish a title';
    end if;
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ink_books_guard_status on public.ink_books;
create trigger ink_books_guard_status before update on public.ink_books
  for each row execute function public.ink_guard_book_status();

-- ── Commerce ───────────────────────────────────────────────────────────────
create table if not exists public.ink_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  reader_id uuid not null references auth.users(id) on delete cascade,
  status public.ink_order_status not null default 'pending',
  currency text not null default 'NGN',
  subtotal_kobo integer not null check (subtotal_kobo >= 0),
  total_kobo integer not null check (total_kobo >= 0),
  provider text not null default 'simulated',
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists ink_orders_reader_idx on public.ink_orders(reader_id, created_at desc);

create table if not exists public.ink_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ink_orders(id) on delete cascade,
  book_id uuid not null references public.ink_books(id) on delete restrict,
  author_id uuid not null references public.ink_authors(id) on delete restrict,
  title text not null,
  unit_price_kobo integer not null check (unit_price_kobo >= 0),
  platform_fee_kobo integer not null check (platform_fee_kobo >= 0),
  author_share_kobo integer not null check (author_share_kobo >= 0)
);
create index if not exists ink_order_items_order_idx on public.ink_order_items(order_id);
create index if not exists ink_order_items_author_idx on public.ink_order_items(author_id);

create table if not exists public.ink_entitlements (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.ink_books(id) on delete cascade,
  order_item_id uuid references public.ink_order_items(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (reader_id, book_id)
);

create table if not exists public.ink_wishlist (
  reader_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.ink_books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reader_id, book_id)
);

create table if not exists public.ink_payouts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.ink_authors(id) on delete cascade,
  amount_kobo integer not null check (amount_kobo > 0),
  status public.ink_payout_status not null default 'requested',
  note text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists ink_payouts_author_idx on public.ink_payouts(author_id, requested_at desc);

create table if not exists public.ink_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.ink_settings (key, value)
values ('store','{"commission_percent": 10, "currency": "NGN", "checkout_mode": "simulated"}'::jsonb)
on conflict (key) do nothing;

-- ── Views ──────────────────────────────────────────────────────────────────
create or replace view public.ink_author_totals as
select a.id as author_id,
  coalesce(sum(oi.author_share_kobo) filter (where o.status = 'paid'), 0)::bigint as lifetime_kobo,
  coalesce(sum(oi.author_share_kobo) filter (where o.status = 'paid' and o.paid_at > now() - interval '30 days'), 0)::bigint as last_30_kobo,
  count(distinct oi.book_id) filter (where o.status = 'paid')::int as titles_sold,
  count(distinct oi.id) filter (where o.status = 'paid')::int as units_sold
from public.ink_authors a
left join public.ink_order_items oi on oi.author_id = a.id
left join public.ink_orders o on o.id = oi.order_id
group by a.id;

create or replace view public.ink_author_balances as
select t.*,
  coalesce((select sum(p.amount_kobo) from public.ink_payouts p
    where p.author_id = t.author_id and p.status in ('requested','approved','paid')), 0)::bigint as committed_kobo,
  (t.lifetime_kobo - coalesce((select sum(p.amount_kobo) from public.ink_payouts p
    where p.author_id = t.author_id and p.status in ('requested','approved','paid')), 0))::bigint as available_kobo
from public.ink_author_totals t;

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.ink_profiles enable row level security;
alter table public.ink_authors enable row level security;
alter table public.ink_books enable row level security;
alter table public.ink_orders enable row level security;
alter table public.ink_order_items enable row level security;
alter table public.ink_entitlements enable row level security;
alter table public.ink_wishlist enable row level security;
alter table public.ink_payouts enable row level security;
alter table public.ink_settings enable row level security;

drop policy if exists ink_profiles_select on public.ink_profiles;
create policy ink_profiles_select on public.ink_profiles for select
  using (id = auth.uid() or public.ink_is_admin());
drop policy if exists ink_profiles_update on public.ink_profiles;
create policy ink_profiles_update on public.ink_profiles for update
  using (id = auth.uid() or public.ink_is_admin())
  with check (id = auth.uid() or public.ink_is_admin());

drop policy if exists ink_authors_select on public.ink_authors;
create policy ink_authors_select on public.ink_authors for select using (true);
drop policy if exists ink_authors_update on public.ink_authors;
create policy ink_authors_update on public.ink_authors for update
  using (profile_id = auth.uid() or public.ink_is_admin())
  with check (profile_id = auth.uid() or public.ink_is_admin());
drop policy if exists ink_authors_delete on public.ink_authors;
create policy ink_authors_delete on public.ink_authors for delete using (public.ink_is_admin());

drop policy if exists ink_books_select on public.ink_books;
create policy ink_books_select on public.ink_books for select using (
  status = 'published'
  or public.ink_is_admin()
  or author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid())
);
drop policy if exists ink_books_insert on public.ink_books;
create policy ink_books_insert on public.ink_books for insert with check (
  public.ink_is_admin()
  or (status in ('draft','pending')
      and author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid()))
);
drop policy if exists ink_books_update on public.ink_books;
create policy ink_books_update on public.ink_books for update
  using (public.ink_is_admin() or author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid()))
  with check (public.ink_is_admin() or author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid()));
drop policy if exists ink_books_delete on public.ink_books;
create policy ink_books_delete on public.ink_books for delete using (
  public.ink_is_admin()
  or (status <> 'published' and author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid()))
);

drop policy if exists ink_orders_select on public.ink_orders;
create policy ink_orders_select on public.ink_orders for select
  using (reader_id = auth.uid() or public.ink_is_admin());

drop policy if exists ink_order_items_select on public.ink_order_items;
create policy ink_order_items_select on public.ink_order_items for select using (
  public.ink_is_admin()
  or order_id in (select o.id from public.ink_orders o where o.reader_id = auth.uid())
  or author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid())
);

drop policy if exists ink_entitlements_select on public.ink_entitlements;
create policy ink_entitlements_select on public.ink_entitlements for select
  using (reader_id = auth.uid() or public.ink_is_admin());

drop policy if exists ink_wishlist_select on public.ink_wishlist;
create policy ink_wishlist_select on public.ink_wishlist for select using (reader_id = auth.uid());
drop policy if exists ink_wishlist_insert on public.ink_wishlist;
create policy ink_wishlist_insert on public.ink_wishlist for insert with check (reader_id = auth.uid());
drop policy if exists ink_wishlist_delete on public.ink_wishlist;
create policy ink_wishlist_delete on public.ink_wishlist for delete using (reader_id = auth.uid());

drop policy if exists ink_payouts_select on public.ink_payouts;
create policy ink_payouts_select on public.ink_payouts for select using (
  public.ink_is_admin()
  or author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid())
);
drop policy if exists ink_payouts_insert on public.ink_payouts;
create policy ink_payouts_insert on public.ink_payouts for insert with check (
  public.ink_is_admin()
  or (status = 'requested' and author_id in (select a.id from public.ink_authors a where a.profile_id = auth.uid()))
);
drop policy if exists ink_payouts_update on public.ink_payouts;
create policy ink_payouts_update on public.ink_payouts for update
  using (public.ink_is_admin()) with check (public.ink_is_admin());

drop policy if exists ink_settings_select on public.ink_settings;
create policy ink_settings_select on public.ink_settings for select using (true);
drop policy if exists ink_settings_write on public.ink_settings;
create policy ink_settings_write on public.ink_settings for all
  using (public.ink_is_admin()) with check (public.ink_is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.ink_authors, public.ink_books, public.ink_settings to anon;
grant select, insert, update, delete on
  public.ink_profiles, public.ink_authors, public.ink_books, public.ink_orders,
  public.ink_order_items, public.ink_entitlements, public.ink_wishlist,
  public.ink_payouts, public.ink_settings to authenticated;
grant select on public.ink_author_totals, public.ink_author_balances to authenticated;
