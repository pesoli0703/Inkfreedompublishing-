-- 0003 Book files, formats, pricing, price overrides, public views, storage buckets and access helpers
create table public.book_files (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.books(id) on delete cascade,
  kind            public.file_kind not null,
  format          public.book_format,
  storage_bucket  text not null default 'book-files',
  storage_path    text not null unique,
  mime_type       text not null,
  size_bytes      bigint not null check (size_bytes between 1 and 209715200),
  checksum_sha256 text,
  version         integer not null default 1 check (version > 0),
  is_current      boolean not null default true,
  scan_status     text not null default 'pending' check (scan_status in ('pending','passed','failed','skipped')),
  uploaded_by     uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (book_id, kind, format, version),
  constraint book_files_bucket_allowed check (storage_bucket in ('book-files','book-samples','book-covers')),
  constraint book_files_digital_kind check (kind not in ('ebook','pdf','interior') or format is not null)
);
create index book_files_book_idx on public.book_files (book_id) where is_current;
create unique index book_files_one_current on public.book_files (book_id, kind, coalesce(format,'ebook'::public.book_format))
  where is_current;

create table public.book_formats (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references public.books(id) on delete cascade,
  format        public.book_format not null,
  is_available  boolean not null default false,
  sku           text unique,
  file_id       uuid references public.book_files(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (book_id, format)
);
create trigger book_formats_touch before update on public.book_formats
  for each row execute function private.set_updated_at();

create table public.book_prices (
  id             uuid primary key default gen_random_uuid(),
  book_format_id uuid not null references public.book_formats(id) on delete cascade,
  currency       char(3) not null references public.currencies(code),
  price_minor    bigint not null check (price_minor >= 0),
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (book_format_id, currency)
);
create index book_prices_currency_idx on public.book_prices (currency) where is_active;

create table public.book_price_overrides (
  id             uuid primary key default gen_random_uuid(),
  book_format_id uuid not null references public.book_formats(id) on delete cascade,
  currency       char(3) not null references public.currencies(code),
  price_minor    bigint not null check (price_minor >= 0),
  reason         text not null,
  created_by     uuid not null references public.profiles(id),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (book_format_id, currency)
);

create table public.book_contributors (
  id           uuid primary key default gen_random_uuid(),
  book_id      uuid not null references public.books(id) on delete cascade,
  author_id    uuid references public.author_profiles(id),
  display_name text not null,
  role         text not null check (role in ('co_author','translator','illustrator','editor')),
  sort_order   integer not null default 0,
  unique (book_id, display_name, role)
);

create view public.published_books with (security_invoker = true) as
select b.id, b.slug, b.title, b.subtitle, b.hook, b.description_paragraphs,
       b.excerpt_label, b.excerpt_body, b.themes, b.keywords, b.language,
       b.page_count, b.publication_date, b.cover_path, b.is_featured, b.featured_rank,
       b.published_at,
       c.slug as category_slug, c.name as category_name,
       a.id as author_id, a.slug as author_slug, a.pen_name as author_name, a.based_in, a.avatar_path as author_avatar_path
from public.books b
join public.categories c on c.id = b.primary_category_id
join public.author_profiles a on a.id = b.author_id
where b.status = 'published' and b.deleted_at is null and c.is_active and a.status = 'approved';

create view public.published_book_offers with (security_invoker = true) as
select f.id as book_format_id, f.book_id, f.format, f.sku,
       p.currency, p.price_minor
from public.book_formats f
join public.book_prices p on p.book_format_id = f.id and p.is_active
join public.published_books b on b.id = f.book_id
where f.is_available;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('book-files','book-files', false, 209715200, array['application/epub+zip','application/pdf','application/x-mobipocket-ebook']),
 ('book-samples','book-samples', false, 20971520, array['application/pdf','application/epub+zip']),
 ('submission-files','submission-files', false, 52428800, array['application/pdf','application/epub+zip','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']),
 ('book-covers','book-covers', true, 10485760, array['image/jpeg','image/png','image/webp']),
 ('author-avatars','author-avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
 ('admin-docs','admin-docs', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Does the caller hold an entitlement for the book that owns this object path?
