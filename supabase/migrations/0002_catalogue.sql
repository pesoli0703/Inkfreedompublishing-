-- 0002 Catalogue core: categories, books, moderation
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
create trigger categories_touch before update on public.categories
  for each row execute function private.set_updated_at();

insert into public.categories (slug, name, note, blurb, sort_order) values
 ('literary-fiction','Literary Fiction','Novels & stories','Character-led novels and story collections built to be re-read.',10),
 ('poetry','Poetry','Collections','Collections with a distinct ear. Short, exact, unhurried.',20),
 ('essays-criticism','Essays & Criticism','Long-form','Long-form thinking on art, cities, faith and culture.',30),
 ('memoir','Memoir & Biography','Lives & accounts','First-person accounts and lives told with care.',40),
 ('business-leadership','Business & Leadership','Practice & craft','Practical books on building organisations with integrity.',50),
 ('children-young-readers','Children & Young Readers','Illustrated','Illustrated stories and early readers, typographically considered.',60);

create table public.books (
  id                     uuid primary key default gen_random_uuid(),
  author_id              uuid not null references public.author_profiles(id) on delete restrict,
  primary_category_id    uuid not null references public.categories(id) on delete restrict,
  slug                   citext not null unique,
  title                  text not null,
  subtitle               text,
  hook                   text not null,
  description_paragraphs text[] not null default '{}',
  excerpt_label          text,
  excerpt_body           text[] not null default '{}',
  themes                 text[] not null default '{}',
  keywords               text[] not null default '{}',
  language               text not null default 'English',
  page_count             integer check (page_count is null or page_count > 0),
  publication_date       date,
  cover_path             text,
  status                 public.book_status not null default 'draft',
  submitted_at           timestamptz,
  reviewed_at            timestamptz,
  reviewed_by            uuid references public.profiles(id),
  review_note            text,
  published_at           timestamptz,
  unpublished_at         timestamptz,
  is_featured            boolean not null default false,
  featured_rank          integer,
  rights_declared_at     timestamptz,
  search_vector          tsvector,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  constraint books_title_len check (char_length(title) between 1 and 200),
  constraint books_hook_len  check (char_length(hook) between 1 and 400),
  constraint books_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index books_author_idx on public.books (author_id);
create index books_status_idx on public.books (status) where deleted_at is null;
create index books_search_idx on public.books using gin (search_vector);
create index books_published_idx on public.books (published_at desc) where status = 'published' and deleted_at is null;
create index books_featured_idx on public.books (featured_rank) where is_featured and status = 'published';
create trigger books_touch before update on public.books
  for each row execute function private.set_updated_at();

-- search vector is maintained by trigger (generated columns cannot use
-- array_to_string, which is STABLE rather than IMMUTABLE)
create function private.books_search_vector() returns trigger
language plpgsql as $$
begin
  new.search_vector :=
      setweight(to_tsvector('simple'::regconfig, coalesce(new.title,'')), 'A')
   || setweight(to_tsvector('simple'::regconfig,
        coalesce(new.subtitle,'') || ' ' || coalesce(new.hook,'')), 'B')
   || setweight(to_tsvector('simple'::regconfig,
        coalesce(array_to_string(new.themes,' '),'') || ' ' ||
        coalesce(array_to_string(new.keywords,' '),'')), 'C');
  return new;
end; $$;
create trigger books_search_vector_biu before insert or update on public.books
  for each row execute function private.books_search_vector();

create table public.book_categories (
  book_id     uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary  boolean not null default false,
  primary key (book_id, category_id)
);

