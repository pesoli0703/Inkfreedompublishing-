-- 0007a Pricing resolution, notifications, author application workflow
alter table public.author_profiles add column if not exists is_featured boolean not null default false;

create function private.round_for_currency(p_amount numeric, p_minor_unit smallint, p_mode text)
returns bigint language plpgsql immutable as $$
declare v_unit bigint := power(10, p_minor_unit)::bigint; v_rounded numeric;
begin
  if p_amount is null or p_amount <= 0 then return null; end if;
  if p_mode = 'none' then
    return round(p_amount)::bigint;
  elsif p_mode = 'nearest_unit' then
    return (round(p_amount / v_unit) * v_unit)::bigint;
  else
    -- psychological: round up to a whole currency unit, then take 1 minor unit off
    v_rounded := ceil(p_amount / v_unit);
    if v_rounded <= 1 then return round(p_amount)::bigint; end if;
    return (v_rounded * v_unit)::bigint - 1;
  end if;
end; $$;

create function public.latest_fx_rate(p_base char(3), p_quote char(3))
returns table (rate numeric, source text, fetched_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.rate, f.source, f.fetched_at
  from public.fx_rates f
  where f.base_code = p_base and f.quote_code = p_quote
  order by f.fetched_at desc limit 1;
$$;

-- Resolves the sellable price for a format in a currency:
-- admin override > explicit catalogue price > FX-converted base price.
create function public.resolve_price(p_book_format_id uuid, p_currency char(3))
returns table (price_minor bigint, source text, fx_rate numeric, as_of timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_settings public.platform_settings;
  v_cur public.currencies;
  v_base_price bigint;
  v_override bigint;
  v_explicit bigint;
  v_rate numeric; v_src text; v_fetched timestamptz;
  v_converted bigint;
begin
  select * into v_settings from public.platform_settings where id;
  select * into v_cur from public.currencies where code = p_currency;
  if v_cur.code is null or not v_cur.is_enabled then return; end if;

  select p.price_minor into v_base_price
  from public.book_prices p
  where p.book_format_id = p_book_format_id and p.currency = v_settings.base_currency and p.is_active;
  if v_base_price is null then return; end if;

  select o.price_minor into v_override
  from public.book_price_overrides o
  where o.book_format_id = p_book_format_id and o.currency = p_currency and o.is_active;

  select p.price_minor into v_explicit
  from public.book_prices p
  where p.book_format_id = p_book_format_id and p.currency = p_currency and p.is_active;

  if p_currency = v_settings.base_currency then
    return query select coalesce(v_override, v_base_price), 'catalogue'::text, 1::numeric, now();
    return;
  end if;
  if v_override is not null then
    return query select v_override, 'admin_override'::text, 1::numeric, now();
    return;
  end if;
  if v_explicit is not null and v_explicit > 0 then
    return query select v_explicit, 'catalogue'::text, 1::numeric, now();
    return;
  end if;

  select f.rate, f.source, f.fetched_at into v_rate, v_src, v_fetched
  from public.latest_fx_rate(v_settings.base_currency, p_currency) f
  where f.fetched_at > now() - interval '7 days';
  if v_rate is null then return; end if;   -- never invent a rate

  v_converted := private.round_for_currency(
    (v_base_price::numeric / 100.0) * v_rate * 100.0 / greatest(power(10, v_cur.minor_unit - 2), 1),
    v_cur.minor_unit, v_settings.price_rounding);

  return query select v_converted, 'fx_converted'::text, v_rate, v_fetched;
end; $$;

grant execute on function public.resolve_price(uuid, char) to anon, authenticated;

-- ---------------------------------------------------------------- notifications
create function private.notify_user(p_user uuid, p_type public.notification_type, p_title text,
                                    p_body text default null, p_link text default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
$$;

-- ---------------------------------------------------------------- author applications
create function public.author_apply(p_full_name text, p_pen_name text, p_biography text,
                                    p_country char(2), p_interests text[] default '{}',
                                    p_photo_path text default null, p_author_details text default null,
                                    p_writing_in text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.author_applications
    (user_id, full_name, pen_name, email, biography, country_code, photo_path, publishing_interests, author_details, writing_in)
  values (auth.uid(), p_full_name, p_pen_name, v_email, p_biography, p_country, p_photo_path, p_interests, p_author_details, p_writing_in)
  returning id into v_id;
  perform private.notify_user(auth.uid(), 'author_application_received',
    'Author application received', 'We have received your application and will review it shortly.', '/author');
  return v_id;
end; $$;
grant execute on function public.author_apply(text,text,text,char,text[],text,text,text) to authenticated;

create function public.admin_decide_author_application(p_application_id uuid, p_decision public.application_status, p_note text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_app public.author_applications; v_slug text; v_author_id uuid;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'decision must be approved or rejected'; end if;
  if coalesce(trim(p_note),'') = '' then raise exception 'a decision note is required'; end if;

  select * into v_app from public.author_applications where id = p_application_id for update;
  if v_app.id is null then raise exception 'application not found'; end if;
  if v_app.status <> 'pending' then raise exception 'application already decided'; end if;

  perform set_config('app.privileged','on', true);

  update public.author_applications
     set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = p_note
   where id = p_application_id;

  if p_decision = 'approved' then
    v_slug := lower(regexp_replace(v_app.pen_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then v_slug := 'author'; end if;
    if exists (select 1 from public.author_profiles where slug = v_slug) then
      v_slug := v_slug || '-' || substr(p_application_id::text, 1, 6);
    end if;

    insert into public.author_profiles
      (user_id, slug, pen_name, tagline, bio, based_in, country_code, writing_in, avatar_path,
       status, approved_by, approved_at)
    values (v_app.user_id, v_slug, v_app.pen_name, null, v_app.biography, null, v_app.country_code,
            v_app.writing_in, v_app.photo_path, 'approved', auth.uid(), now())
    on conflict (user_id) do update
      set status = 'approved', approved_by = auth.uid(), approved_at = now()
    returning id into v_author_id;

    update public.profiles set role = 'author' where id = v_app.user_id;
    perform private.notify_user(v_app.user_id, 'author_application_approved',
      'Your author application was approved', p_note, '/author');
  else
    perform private.notify_user(v_app.user_id, 'author_application_rejected',
      'Your author application was not approved', p_note, '/publish');
  end if;

  perform set_config('app.privileged','off', true);
  perform private.write_audit('author_application.' || p_decision::text, 'author_application',
    p_application_id::text, to_jsonb(v_app.status), jsonb_build_object('decision', p_decision, 'note', p_note));
end; $$;
grant execute on function public.admin_decide_author_application(uuid, public.application_status, text) to authenticated;

-- ---------------------------------------------------------------- book submission + moderation
