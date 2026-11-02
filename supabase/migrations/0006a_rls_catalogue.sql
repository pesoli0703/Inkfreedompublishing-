-- 0006 Row Level Security: deny by default, explicit policies per operation
-- 0006 Row Level Security: deny by default, explicit policies per operation
alter table public.categories             enable row level security;
alter table public.books                  enable row level security;
alter table public.book_categories        enable row level security;
alter table public.book_files             enable row level security;
alter table public.book_formats           enable row level security;
alter table public.book_prices            enable row level security;
alter table public.book_price_overrides   enable row level security;
alter table public.book_contributors      enable row level security;
alter table public.book_moderation_events enable row level security;
alter table public.profiles               enable row level security;
alter table public.author_applications    enable row level security;
alter table public.author_profiles        enable row level security;
alter table public.payout_accounts        enable row level security;
alter table public.currencies             enable row level security;
alter table public.fx_rates               enable row level security;
alter table public.platform_settings      enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.payments               enable row level security;
alter table public.payment_events         enable row level security;
alter table public.refunds                enable row level security;
alter table public.entitlements           enable row level security;
alter table public.download_events        enable row level security;
alter table public.coupons                enable row level security;
alter table public.coupon_redemptions     enable row level security;
alter table public.wishlist_items         enable row level security;
alter table public.reviews                enable row level security;
alter table public.notifications          enable row level security;
alter table public.support_tickets        enable row level security;
alter table public.support_messages       enable row level security;
alter table public.copyright_reports      enable row level security;
alter table public.withdrawals            enable row level security;
alter table public.withdrawal_events      enable row level security;
alter table public.payout_records         enable row level security;
alter table public.ledger_transactions    enable row level security;
alter table public.ledger_entries         enable row level security;
alter table public.audit_log              enable row level security;

-- ------------------------------------------------------------ reference data
create policy categories_read on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy categories_admin_write on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy currencies_read on public.currencies for select to anon, authenticated using (true);
create policy currencies_admin_write on public.currencies for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy fx_rates_read on public.fx_rates for select to anon, authenticated using (true);
create policy fx_rates_admin_write on public.fx_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy platform_settings_admin on public.platform_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ catalogue
create policy books_public_read on public.books for select to anon, authenticated
  using ((status = 'published' and deleted_at is null) or public.is_admin() or author_id = public.current_author_id());
create policy books_author_insert on public.books for insert to authenticated
  with check (author_id = public.current_author_id() and status = 'draft'
              and reviewed_by is null and published_at is null and is_featured = false);
create policy books_author_update on public.books for update to authenticated
  using (author_id = public.current_author_id())
  with check (author_id = public.current_author_id());
create policy books_admin_all on public.books for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy book_categories_public_read on public.book_categories for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.status = 'published'));
create policy book_categories_author on public.book_categories for all to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin())
  with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin());

create policy book_files_author_read on public.book_files for select to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin());
create policy book_files_author_write on public.book_files for insert to authenticated
  with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id())
              and uploaded_by = auth.uid());
create policy book_files_author_update on public.book_files for update to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()));
create policy book_files_admin_all on public.book_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy book_formats_public_read on public.book_formats for select to anon, authenticated
  using (is_available and exists (select 1 from public.books b where b.id = book_id and b.status = 'published')
         or exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id())
         or public.is_admin());
create policy book_formats_author_write on public.book_formats for all to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin())
  with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin());

create policy book_prices_public_read on public.book_prices for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.book_formats f join public.books b on b.id = f.book_id
    where f.id = book_format_id and (b.status = 'published' or b.author_id = public.current_author_id() or public.is_admin())));
create policy book_prices_author_write on public.book_prices for all to authenticated
  using (exists (select 1 from public.book_formats f join public.books b on b.id = f.book_id
                 where f.id = book_format_id and b.author_id = public.current_author_id()) or public.is_admin())
  with check (exists (select 1 from public.book_formats f join public.books b on b.id = f.book_id
                 where f.id = book_format_id and b.author_id = public.current_author_id()) or public.is_admin());

create policy book_price_overrides_admin on public.book_price_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy book_price_overrides_public_read on public.book_price_overrides for select to anon, authenticated
  using (is_active);

create policy book_contributors_public_read on public.book_contributors for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.status = 'published'));
create policy book_contributors_author on public.book_contributors for all to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin())
  with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()) or public.is_admin());

create policy book_moderation_author_read on public.book_moderation_events for select to authenticated
  using (exists (select 1 from public.books b where b.id = book_id and b.author_id = public.current_author_id()));
create policy book_moderation_admin_read on public.book_moderation_events for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------ accounts
