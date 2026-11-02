-- 0008a Order creation (server-side pricing, currency lock) and payment initiation
-- Fix: book_format enum is paperback|hardcover|ebook (PDF is a file kind, not a format)
create or replace function public.book_submit(p_book_id uuid)
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
    where f.book_id = p_book_id and f.is_available and f.format = 'ebook'
      and not exists (select 1 from public.book_files bf
                      where bf.book_id = f.book_id and bf.is_current and bf.scan_status <> 'failed'
                        and bf.kind in ('ebook','pdf'))
  ) then v_problems := v_problems || 'a digital file (EPUB or PDF) is required for a digital format'; end if;

  if array_length(v_problems,1) > 0 then
    raise exception 'cannot submit: %', array_to_string(v_problems, '; ');
  end if;

  update public.books set status = 'submitted', submitted_at = now() where id = p_book_id;
  insert into public.book_moderation_events (book_id, from_status, to_status, action, actor_id, actor_role, note)
  values (p_book_id, v_book.status, 'submitted', 'submitted', auth.uid(), 'author',
          'Rights declared at ' || v_book.rights_declared_at::text);
  perform private.notify_user(auth.uid(), 'book_submitted', 'Book submitted for review', v_book.title, '/author/books');
end; $$;

-- Creates an order. All prices are resolved on the server from the catalogue and FX
-- tables; nothing supplied by the browser is trusted except which format and how many.
create function public.place_order(p_items jsonb, p_currency char(3),
                                   p_coupon text default null, p_email text default null)
returns table (o_order_id uuid, o_order_number text, o_total_minor bigint, o_currency char(3))
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.platform_settings;
  v_item jsonb; v_fmt public.book_formats; v_book public.books; v_author text;
  v_price record; v_qty integer; v_seen uuid[] := '{}';
  v_subtotal bigint := 0; v_discount bigint := 0; v_commission_base bigint := 0;
  v_order_id uuid; v_number text; v_email text; v_coupon public.coupons;
  v_lines jsonb := '[]'::jsonb; v_rate numeric := 1; v_base_total bigint;
begin
  if v_uid is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'an order needs at least one item'; end if;
  select * into v_settings from public.platform_settings where id;
  if not exists (select 1 from public.currencies where code = p_currency and is_enabled) then
    raise exception 'currency % is not available', p_currency;
  end if;
  if v_email is null then select p.email::text into v_email from public.profiles p where p.id = v_uid; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item->>'book_format_id' is null then raise exception 'each item needs a book_format_id'; end if;
    select * into v_fmt from public.book_formats where id = (v_item->>'book_format_id')::uuid;
    if v_fmt.id is null then raise exception 'format not found'; end if;
    if v_fmt.id = any(v_seen) then raise exception 'duplicate format in order'; end if;
    v_seen := v_seen || v_fmt.id;
    if not v_fmt.is_available then raise exception 'that format is not available'; end if;

    select * into v_book from public.books where id = v_fmt.book_id and status = 'published' and deleted_at is null;
    if v_book.id is null then raise exception 'that book is not on sale'; end if;

    select * into v_price from public.resolve_price(v_fmt.id, p_currency);
    if v_price.price_minor is null then
      raise exception 'no % price is available for % right now', p_currency, v_book.title;
    end if;

    v_qty := coalesce(nullif(v_item->>'quantity','')::integer, 1);
    if v_qty < 1 or v_qty > 10 then raise exception 'quantity must be between 1 and 10'; end if;

    select ap.pen_name into v_author from public.author_profiles ap where ap.id = v_book.author_id;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'book_id', v_book.id, 'book_format_id', v_fmt.id, 'author_id', v_book.author_id,
      'title', v_book.title, 'author', coalesce(v_author,''), 'format', v_fmt.format::text,
      'unit', v_price.price_minor, 'qty', v_qty, 'source', v_price.source,
      'fx', v_price.fx_rate, 'kind', case when v_fmt.format = 'ebook' then 'digital' else 'print' end));

    v_subtotal := v_subtotal + v_price.price_minor * v_qty;
    if v_fmt.format = 'ebook' then
      v_commission_base := v_commission_base + v_price.price_minor * v_qty;
    end if;
  end loop;

  if p_coupon is not null and trim(p_coupon) <> '' then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon)) and is_active;
    if v_coupon.id is null then raise exception 'that coupon code is not valid'; end if;
    if v_coupon.starts_at > now() or (v_coupon.ends_at is not null and v_coupon.ends_at < now()) then
      raise exception 'that coupon is not active right now';
    end if;
    if v_coupon.max_redemptions is not null and v_coupon.times_redeemed >= v_coupon.max_redemptions then
      raise exception 'that coupon has been fully redeemed';
    end if;
    if v_subtotal < v_coupon.min_order_minor then
      raise exception 'that coupon needs a minimum order of %', v_coupon.min_order_minor;
    end if;
    if v_coupon.type = 'percentage' then
      v_discount := floor(v_subtotal::numeric * v_coupon.value / 10000.0)::bigint;
    else
      if v_coupon.currency <> p_currency then raise exception 'that coupon is for a different currency'; end if;
      v_discount := least(v_coupon.value, v_subtotal);
    end if;
  end if;

  if v_commission_base > 0 then
    v_commission_base := greatest(v_commission_base - v_discount, 0);
  end if;

  v_number := 'INK-' || to_char(now(), 'YYMM') || '-' ||
              lpad(nextval('private.order_number_seq')::text, 6, '0');

  if p_currency <> v_settings.base_currency then
    select f.rate into v_rate from public.latest_fx_rate(p_currency, v_settings.base_currency) f
    where f.fetched_at > now() - interval '7 days';
    v_rate := coalesce(v_rate, 1);
  end if;
  v_base_total := round((v_subtotal - v_discount)::numeric * v_rate)::bigint;

  insert into public.orders (order_number, reader_id, status, currency, subtotal_minor, shipping_minor,
                             tax_minor, discount_minor, total_minor, commission_base_minor,
                             fx_rate_to_base, base_currency, base_total_minor, email, coupon_code)
  values (v_number, v_uid, 'pending_payment', p_currency, v_subtotal, 0, 0, v_discount,
          v_subtotal - v_discount, v_commission_base, v_rate, v_settings.base_currency,
          v_base_total, v_email::citext, case when v_coupon.id is null then null else v_coupon.code::text end)
  returning id into v_order_id;

  insert into public.order_items (order_id, book_id, book_format_id, author_id, title_snapshot,
                                  author_snapshot, format_snapshot, currency, unit_price_minor,
                                  quantity, is_commissionable, commission_bps, price_source, fx_rate_used)
  select v_order_id, (l->>'book_id')::uuid, (l->>'book_format_id')::uuid, (l->>'author_id')::uuid,
         l->>'title', l->>'author', (l->>'format')::public.book_format, p_currency,
         (l->>'unit')::bigint, (l->>'qty')::integer,
         (l->>'kind') = 'digital', v_settings.platform_fee_bps, l->>'source', (l->>'fx')::numeric
  from jsonb_array_elements(v_lines) l;

  if v_coupon.id is not null then
    insert into public.coupon_redemptions (coupon_id, order_id, reader_id)
    values (v_coupon.id, v_order_id, v_uid);
    update public.coupons set times_redeemed = times_redeemed + 1 where id = v_coupon.id;
  end if;

  return query select v_order_id, v_number, (v_subtotal - v_discount), p_currency;
end; $$;
grant execute on function public.place_order(jsonb, char, text, text) to authenticated;

-- Opens (or reuses) a payment attempt for an order. Amount and currency are copied
-- from the order and can never be supplied by the client.
create function public.open_payment(p_order_id uuid)
returns table (o_payment_id uuid, o_provider_tx_ref text, o_amount_minor bigint, o_currency char(3))
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order public.orders; v_pay public.payments; v_mode text; v_ref text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select payments_mode into v_mode from public.platform_settings where id;
  if v_mode = 'disabled' then
    raise exception 'online payments are currently disabled for this platform' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.reader_id <> auth.uid() then raise exception 'not your order' using errcode = '42501'; end if;
  if v_order.status not in ('draft','pending_payment','failed') then
    raise exception 'order is not payable (%)', v_order.status;
  end if;

  select * into v_pay from public.payments
  where order_id = p_order_id and status in ('initiated','pending')
  order by created_at desc limit 1;
  if v_pay.id is not null then
    return query select v_pay.id, v_pay.provider_tx_ref, v_pay.amount_minor, v_pay.currency;
    return;
  end if;

  v_ref := 'INKF-' || v_order.order_number || '-' ||
           substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.payments (order_id, provider, provider_tx_ref, status, currency, amount_minor, payer_email)
  values (p_order_id, 'flutterwave', v_ref, 'initiated', v_order.currency, v_order.total_minor, v_order.email)
  returning * into v_pay;

  update public.orders set status = 'pending_payment' where id = p_order_id and status <> 'pending_payment';

  return query select v_pay.id, v_ref, v_order.total_minor, v_order.currency;
end; $$;
grant execute on function public.open_payment(uuid) to authenticated;
