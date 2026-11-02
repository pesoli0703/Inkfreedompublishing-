-- 0005 Storage access helpers and object policies
create function public.can_read_book_object(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or exists (
    select 1
    from public.book_files bf
    join public.entitlements e on e.book_id = bf.book_id
    join public.orders o on o.id = e.order_id
    where bf.storage_path = p_name
      and e.reader_id = auth.uid()
      and e.revoked_at is null
      and o.status in ('paid','fulfilled','partially_refunded')
  );
$$;

create function public.owns_book_object(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.book_files bf
    join public.books b on b.id = bf.book_id
    where bf.storage_path = p_name and b.author_id = public.current_author_id()
  );
$$;

create function public.can_read_sample_object(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.book_files bf
    join public.books b on b.id = bf.book_id
    where bf.storage_path = p_name and b.status = 'published'
  ) or public.owns_book_object(p_name) or public.is_admin();
$$;

create function public.author_owns_book_prefix(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.books b
    where b.id::text = (storage.foldername(p_name))[1]
      and b.author_id = public.current_author_id()
  );
$$;

grant execute on function public.can_read_book_object(text) to authenticated;
grant execute on function public.can_read_sample_object(text) to authenticated, anon;
grant execute on function public.owns_book_object(text) to authenticated;
grant execute on function public.author_owns_book_prefix(text) to authenticated;

-- ---- book-files (private paid content) ----
create policy book_files_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'book-files' and public.owns_book_object(name));
create policy book_files_entitled_read on storage.objects for select to authenticated
  using (bucket_id = 'book-files' and public.can_read_book_object(name));
create policy book_files_author_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'book-files' and public.author_owns_book_prefix(name));
create policy book_files_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'book-files' and public.is_admin())
  with check (bucket_id = 'book-files' and public.is_admin());

-- ---- book-samples (private previews) ----
create policy book_samples_read on storage.objects for select to authenticated
  using (bucket_id = 'book-samples' and public.can_read_sample_object(name));
create policy book_samples_author_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'book-samples' and public.author_owns_book_prefix(name));
create policy book_samples_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'book-samples' and public.is_admin())
  with check (bucket_id = 'book-samples' and public.is_admin());

-- ---- submission-files (applications, private to the applicant + admins) ----
create policy submission_files_self_rw on storage.objects for all to authenticated
  using (bucket_id = 'submission-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'submission-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy submission_files_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'submission-files' and public.is_admin());

-- ---- book-covers (public bucket, author-owned writes) ----
create policy book_covers_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'book-covers');
create policy book_covers_author_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'book-covers'
    and (public.author_owns_book_prefix(name)
         or (storage.foldername(name))[1] = public.current_author_id()::text)
  );
create policy book_covers_author_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'book-covers'
    and (public.author_owns_book_prefix(name)
         or (storage.foldername(name))[1] = public.current_author_id()::text)
  );

-- ---- author-avatars (public bucket) ----
create policy author_avatars_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'author-avatars');
create policy author_avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'author-avatars'
              and (storage.foldername(name))[1] in (public.current_author_id()::text, auth.uid()::text));

-- ---- admin-docs (private, admins only) ----
create policy admin_docs_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'admin-docs' and public.is_admin())
  with check (bucket_id = 'admin-docs' and public.is_admin());
