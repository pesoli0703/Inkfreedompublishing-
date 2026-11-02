-- 0009c reader_addresses was missed in the first RLS pass
alter table public.reader_addresses enable row level security;
create policy reader_addresses_owner on public.reader_addresses for all to authenticated
  using (reader_id = auth.uid()) with check (reader_id = auth.uid());
create policy reader_addresses_admin_read on public.reader_addresses for select to authenticated using (public.is_admin());
