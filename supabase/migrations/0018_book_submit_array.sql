-- 0018 book_submit concatenated a bare string onto a text[] (22P02 whenever a
-- submission had any problem), and compared book_format to the file_kind label
-- 'pdf', which cannot be cast. Both fixed; the readiness checks are unchanged.
create or replace function public.book_submit(p_book_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_book public.books; v_problems text[] := '{}'; v_formats integer;
begin
  select * into v_book from public.books where id = p_book_id for update;
  if v_book.id is null then raise exception 'book not found'; end if;
  if v_book.author_id is distinct from public.current_author_id() then
    raise exception 'you may only submit your own books' using errcode = '42501';
  end if;
  if v_book.status not in ('draft','changes_requested') then
    raise exception 'book is not in a submittable state (%)', v_book.status;
  end if;

  if coalesce(trim(v_book.title),'') = '' then
    v_problems := v_problems || array['a title is required'];
  end if;
  if coalesce(array_length(v_book.description_paragraphs,1),0) = 0 then
    v_problems := v_problems || array['at least one description paragraph is required'];
  end if;
  if v_book.cover_path is null then
    v_problems := v_problems || array['a cover image is required'];
  end if;
  if v_book.rights_declared_at is null then
    v_problems := v_problems || array['the rights declaration must be accepted'];
  end if;

  select count(*) into v_formats from public.book_formats where book_id = p_book_id and is_available;
  if v_formats = 0 then
    v_problems := v_problems || array['at least one format must be available'];
  end if;

  if exists (
    select 1 from public.book_formats f
    where f.book_id = p_book_id and f.is_available
      and not exists (select 1 from public.book_prices p
                      where p.book_format_id = f.id and p.is_active and p.currency = 'NGN')
  ) then
    v_problems := v_problems || array['every available format needs an active NGN base price'];
  end if;

  if exists (
    select 1 from public.book_formats f
    where f.book_id = p_book_id and f.is_available and f.format = 'ebook'
      and not exists (select 1 from public.book_files bf
                      where bf.book_id = f.book_id and bf.is_current and bf.scan_status <> 'failed'
                        and bf.kind::text in ('ebook','pdf'))
  ) then
    v_problems := v_problems || array['a digital file (EPUB or PDF) is required for a digital format'];
  end if;

  if array_length(v_problems,1) > 0 then
    raise exception 'cannot submit: %', array_to_string(v_problems, '; ');
  end if;

  update public.books set status = 'submitted', submitted_at = now() where id = p_book_id;
  insert into public.book_moderation_events (book_id, from_status, to_status, action, actor_id, actor_role, note)
  values (p_book_id, v_book.status, 'submitted', 'submitted', auth.uid(), 'author',
          'Rights declared at ' || v_book.rights_declared_at::text);
  perform private.notify_user(auth.uid(), 'book_submitted', 'Book submitted for review', v_book.title, '/author/books');
end; $$;
