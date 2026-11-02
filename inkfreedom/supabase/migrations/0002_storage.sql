-- Inkfreedom · storage
-- covers: public, so the shelf can render real artwork.
-- ebooks: private, reachable only through a short-lived signed URL issued after
-- an entitlement check on the server.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('ebooks', 'ebooks', false, 157286400, array['application/pdf', 'application/epub+zip'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── covers ─────────────────────────────────────────────────────────────────
 drop policy if exists "covers are readable by everyone" on storage.objects;
create policy "covers are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'covers');

drop policy if exists "authors upload their own covers" on storage.objects;
create policy "authors upload their own covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authors replace their own covers" on storage.objects;
create policy "authors replace their own covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owners or admins remove covers" on storage.objects;
create policy "owners or admins remove covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'covers'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ink_is_admin())
  );

-- ── ebooks ─────────────────────────────────────────────────────────────────
-- No select policy for readers on purpose: files are served only through the
-- signed-download route, which verifies an entitlement before issuing a URL.
drop policy if exists "authors read their own ebook files" on storage.objects;
create policy "authors read their own ebook files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ebooks'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ink_is_admin())
  );

drop policy if exists "authors upload their own ebook files" on storage.objects;
create policy "authors upload their own ebook files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ebooks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owners or admins remove ebook files" on storage.objects;
create policy "owners or admins remove ebook files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'ebooks'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ink_is_admin())
  );
