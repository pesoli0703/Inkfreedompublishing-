-- 0007b Book submission, moderation, publication, featuring, FX and price overrides
create function public.book_submit(p_book_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
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

  if coalesce(trim(v_book.title),'') = '' then v_problems := v_problems || 'a title is required'; end if;
  if coalesce(array_length(v_book.description_paragraphs,1),0) = 0 then
    v_problems := v_problems || 'at least one description paragraph is required'; end if;
  if v_book.cover_path is null then v_problems := v_problems || 'a cover image is required'; end if;
  if v_book.rights_declared_at is null then v_problems := v_problems || 'the rights declaration must be accepted'; end if;

  select count(*) into v_formats from public.book_formats where book_id = p_book_id and is_available;
  if v_formats = 0 then v_problems := v_problems || 'at least one format must be available'; end if;

  if exists (
    select 1 from public.book_formats f
    where f.book_id = p_book_id and f.is_available
      and not exists (select 1 from public.book_prices p
                      where p.book_format_id = f.id and p.is_active and p.currency = 'NGN')
  ) then v_problems := v_problems || 'every available format needs an active NGN base price'; end if;

  if exists (
    select 1 from public.book_formats f
    where f.book_id = p_book_id and f.is_available and f.format in ('ebook','pdf')
      and not exists (select 1 from public.book_files bf
                      where bf.book_id = f.book_id and bf.is_current and bf.scan_status <> 'failed'
                        and bf.kind in ('ebook','pdf'))
  ) then v_problems := v_problems || 'a digital file (EPUB or PDF) is required for digital formats'; end if;

  if array_length(v_problems,1) > 0 then
    raise exception 'cannot submit: %', array_to_string(v_problems, '; ');
  end if;

  update public.books set status = 'submitted', submitted_at = now() where id = p_book_id;
  insert into public.book_moderation_events (book_id, from_status, to_status, action, actor_id, actor_role, note)
  values (p_book_id, v_book.status, 'submitted', 'submitted', auth.uid(), 'author',
          'Rights declared at ' || v_book.rights_declared_at::text);
  perform private.notify_user(auth.uid(), 'book_submitted', 'Book submitted for review', v_book.title, '/author/books');
end; $$;
grant execute on function public.book_submit(uuid) to authenticated;

create function public.admin_moderate_book(p_book_id uuid, p_decision text, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_book public.books; v_new public.book_status;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_decision not in ('approved','rejected','changes_requested') then
    raise exception 'decision must be approved, rejected or changes_requested'; end if;
  if coalesce(trim(p_note),'') = '' then raise exception 'a decision note is required'; end if;

  select * into v_book from public.books where id = p_book_id for update;
  if v_book.id is null then raise exception 'book not found'; end if;
  if v_book.status <> 'submitted' then raise exception 'book is not awaiting review (%)', v_book.status; end if;

  v_new := p_decision::public.book_status;
  update public.books
     set status = v_new, reviewed_at = now(), reviewed_by = auth.uid(), review_note = p_note
   where id = p_book_id;

  insert into public.book_moderation_events (book_id, from_status, to_status, action, actor_id, actor_role, note)
  values (p_book_id, v_book.status, v_new, p_decision, auth.uid(), 'admin', p_note);

  perform private.notify_user(
    (select user_id from public.author_profiles where id = v_book.author_id),
    case p_decision when 'approved' then 'book_approved'::public.notification_type
                    when 'rejected' then 'book_rejected'::public.notification_type
                    else 'book_changes_requested'::public.notification_type end,
    case p_decision when 'approved' then 'Book approved' when 'rejected' then 'Book rejected'
                    else 'Changes requested on your book' end,
    v_book.title || ' — ' || p_note, '/author/books');

  perform private.write_audit('book.' || p_decision, 'book', p_book_id::text,
    jsonb_build_object('status', v_book.status), jsonb_build_object('status', v_new, 'note', p_note));
end; $$;
grant execute on function public.admin_moderate_book(uuid, text, text) to authenticated;

create function public.admin_set_publication(p_book_id uuid, p_publish boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_book public.books; v_new public.book_status;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select * into v_book from public.books where id = p_book_id for update;
  if v_book.id is null then raise exception 'book not found'; end if;

  if p_publish then
    if v_book.status not in ('approved','unpublished') then
      raise exception 'only approved books can be published (%)', v_book.status;
    end if;
    v_new := 'published';
  else
    if v_book.status <> 'published' then raise exception 'book is not published'; end if;
    v_new := 'unpublished';
  end if;

  update public.books set status = v_new where id = p_book_id;
  insert into public.book_moderation_events (book_id, from_status, to_status, action, actor_id, actor_role, note)
  values (p_book_id, v_book.status, v_new, case when p_publish then 'published' else 'unpublished' end,
          auth.uid(), 'admin', null);
  perform private.write_audit('book.' || v_new::text, 'book', p_book_id::text,
    jsonb_build_object('status', v_book.status), jsonb_build_object('status', v_new));
end; $$;
grant execute on function public.admin_set_publication(uuid, boolean) to authenticated;

create function public.admin_set_featured(p_book_id uuid, p_featured boolean, p_rank integer default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  update public.books set is_featured = p_featured, featured_rank = p_rank where id = p_book_id;
  perform private.write_audit('book.featured', 'book', p_book_id::text, null,
    jsonb_build_object('is_featured', p_featured, 'rank', p_rank));
end; $$;
grant execute on function public.admin_set_featured(uuid, boolean, integer) to authenticated;

create function public.admin_set_featured_author(p_author_id uuid, p_featured boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  update public.author_profiles set is_featured = p_featured where id = p_author_id;
  perform private.write_audit('author.featured', 'author', p_author_id::text, null,
    jsonb_build_object('is_featured', p_featured));
end; $$;
grant execute on function public.admin_set_featured_author(uuid, boolean) to authenticated;

create function public.admin_upsert_fx(p_base char(3), p_quote char(3), p_rate numeric, p_source text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_rate is null or p_rate <= 0 then raise exception 'rate must be positive'; end if;
  insert into public.fx_rates (base_code, quote_code, rate, source) values (p_base, p_quote, p_rate, p_source);
  perform private.write_audit('fx.upsert', 'fx_rate', p_base || p_quote,
    null, jsonb_build_object('rate', p_rate, 'source', p_source));
end; $$;
grant execute on function public.admin_upsert_fx(char, char, numeric, text) to authenticated;

create function public.admin_set_price_override(p_book_format_id uuid, p_currency char(3),
                                                p_price_minor bigint, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'a reason is required for a price override'; end if;
  insert into public.book_price_overrides (book_format_id, currency, price_minor, reason, created_by)
  values (p_book_format_id, p_currency, p_price_minor, p_reason, auth.uid())
  on conflict (book_format_id, currency) do update
    set price_minor = excluded.price_minor, reason = excluded.reason,
        created_by = excluded.created_by, is_active = true;
  perform private.write_audit('price.override', 'book_format', p_book_format_id::text, null,
    jsonb_build_object('currency', p_currency, 'price_minor', p_price_minor, 'reason', p_reason));
end; $$;
grant execute on function public.admin_set_price_override(uuid, char, bigint, text) to authenticated;
