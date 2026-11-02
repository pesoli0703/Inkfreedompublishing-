-- 0006 Row Level Security: deny by default, explicit policies per operation
alter table public.profiles enable row level security;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated using (public.is_admin());

create policy author_profiles_public_read on public.author_profiles for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy author_profiles_self_update on public.author_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy author_profiles_admin_all on public.author_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy author_applications_self_read on public.author_applications for select to authenticated using (user_id = auth.uid());
create policy author_applications_self_insert on public.author_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and decided_by is null);
create policy author_applications_admin_all on public.author_applications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payout_accounts_author on public.payout_accounts for all to authenticated
  using (author_id = public.current_author_id()) with check (author_id = public.current_author_id());
create policy payout_accounts_admin_read on public.payout_accounts for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------ commerce
create policy orders_reader_read on public.orders for select to authenticated using (reader_id = auth.uid());
create policy orders_author_read on public.orders for select to authenticated
  using (exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.author_id = public.current_author_id()));
create policy orders_admin_all on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy order_items_reader_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.reader_id = auth.uid()));
create policy order_items_author_read on public.order_items for select to authenticated
  using (author_id = public.current_author_id());
create policy order_items_admin_all on public.order_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_reader_read on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.reader_id = auth.uid()));
create policy payments_admin_all on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payment_events_admin_read on public.payment_events for select to authenticated using (public.is_admin());

create policy refunds_reader_read on public.refunds for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.reader_id = auth.uid()));
create policy refunds_author_read on public.refunds for select to authenticated
  using (exists (select 1 from public.order_items oi where oi.order_id = order_id and oi.author_id = public.current_author_id()));
create policy refunds_admin_all on public.refunds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy entitlements_reader_read on public.entitlements for select to authenticated using (reader_id = auth.uid());
create policy entitlements_admin_all on public.entitlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy download_events_reader_read on public.download_events for select to authenticated using (user_id = auth.uid());
create policy download_events_admin_read on public.download_events for select to authenticated using (public.is_admin());

create policy coupons_read on public.coupons for select to authenticated using (is_active or public.is_admin());
create policy coupons_admin_write on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy coupon_redemptions_read on public.coupon_redemptions for select to authenticated
  using (reader_id = auth.uid() or public.is_admin());
create policy coupon_redemptions_admin_write on public.coupon_redemptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ reader content
create policy wishlist_owner on public.wishlist_items for all to authenticated
  using (reader_id = auth.uid()) with check (reader_id = auth.uid());

create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (status = 'published' or reader_id = auth.uid() or public.is_admin());
create policy reviews_reader_insert on public.reviews for insert to authenticated
  with check (reader_id = auth.uid() and status = 'pending' and exists (
    select 1 from public.entitlements e
    where e.book_id = book_id and e.reader_id = auth.uid() and e.revoked_at is null));
create policy reviews_reader_update on public.reviews for update to authenticated
  using (reader_id = auth.uid()) with check (reader_id = auth.uid() and status = 'pending');
create policy reviews_admin_all on public.reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy notifications_owner_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_all on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy support_tickets_owner on public.support_tickets for all to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy support_messages_read on public.support_messages for select to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin())));
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (author_id = auth.uid() and (is_staff = false or public.is_admin()) and exists (
    select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin())));

create policy copyright_reports_insert on public.copyright_reports for insert to anon, authenticated
  with check (status = 'received' and handled_by is null);
create policy copyright_reports_admin on public.copyright_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------ money
