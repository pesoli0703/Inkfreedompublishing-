-- 0009 Currency-resolved offers and support/review/copyright workflows
-- 0009 Currency-resolved offers, support/review/copyright workflows, admin stats
create view public.book_offers_resolved with (security_invoker = true) as
select b.id as book_id, b.slug, b.title, b.author_name, b.author_slug, b.category_slug,
       b.cover_path, f.id as book_format_id, f.format, c.code as currency,
       r.price_minor, r.source, r.fx_rate, r.as_of
from public.published_books b
join public.book_formats f on f.book_id = b.id and f.is_available
cross join public.currencies c
cross join lateral public.resolve_price(f.id, c.code) r
where c.is_enabled;
grant select on public.book_offers_resolved to anon, authenticated;

create function public.create_support_ticket(p_subject text, p_category text, p_body text,
                                             p_order_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if coalesce(trim(p_subject),'') = '' or coalesce(trim(p_body),'') = '' then
    raise exception 'a subject and message are required';
  end if;
  insert into public.support_tickets (user_id, subject, category, status, order_id)
  values (auth.uid(), left(p_subject, 200), coalesce(nullif(p_category,''),'general'), 'open', p_order_id)
  returning id into v_id;
  insert into public.support_messages (ticket_id, author_id, is_staff, body)
  values (v_id, auth.uid(), false, p_body);
  return v_id;
end; $$;
grant execute on function public.create_support_ticket(text, text, text, uuid) to authenticated;

create function public.support_reply(p_ticket_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_t public.support_tickets; v_staff boolean; v_owner uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if coalesce(trim(p_body),'') = '' then raise exception 'a message is required'; end if;
  select * into v_t from public.support_tickets where id = p_ticket_id;
  if v_t.id is null then raise exception 'ticket not found'; end if;
  v_staff := public.is_admin();
  if not v_staff and v_t.user_id <> auth.uid() then raise exception 'not your ticket' using errcode = '42501'; end if;

  insert into public.support_messages (ticket_id, author_id, is_staff, body)
  values (p_ticket_id, auth.uid(), v_staff, p_body);

  update public.support_tickets set status = case when v_staff then 'in_progress'::public.support_status
                                                  when status = 'resolved' then 'open'::public.support_status
                                                  else status end,
                                    updated_at = now()
   where id = p_ticket_id;

  v_owner := case when v_staff then v_t.user_id else null end;
  if v_owner is not null then
    perform private.notify_user(v_owner, 'support_reply', 'Support replied to your ticket', v_t.subject, '/dashboard/support');
  end if;
end; $$;
grant execute on function public.support_reply(uuid, text) to authenticated;

create function public.admin_set_ticket_status(p_ticket_id uuid, p_status public.support_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  update public.support_tickets set status = p_status, updated_at = now() where id = p_ticket_id;
end; $$;
grant execute on function public.admin_set_ticket_status(uuid, public.support_status) to authenticated;

create function public.admin_set_review_status(p_review_id uuid, p_status public.review_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  update public.reviews set status = p_status, updated_at = now() where id = p_review_id;
  perform private.write_audit('review.' || p_status::text, 'review', p_review_id::text, null,
    jsonb_build_object('status', p_status));
end; $$;
grant execute on function public.admin_set_review_status(uuid, public.review_status) to authenticated;

create function public.admin_resolve_copyright(p_report_id uuid, p_status public.copyright_status,
                                               p_resolution text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_rep public.copyright_reports;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if coalesce(trim(p_resolution),'') = '' then raise exception 'a resolution note is required'; end if;
  select * into v_rep from public.copyright_reports where id = p_report_id;
  if v_rep.id is null then raise exception 'report not found'; end if;
  update public.copyright_reports set status = p_status, resolution = p_resolution,
         handled_by = auth.uid(), updated_at = now()
   where id = p_report_id;
  perform private.write_audit('copyright.' || p_status::text, 'copyright_report', p_report_id::text,
    jsonb_build_object('status', v_rep.status), jsonb_build_object('status', p_status, 'resolution', p_resolution));
end; $$;
grant execute on function public.admin_resolve_copyright(uuid, public.copyright_status, text) to authenticated;

-- Only an existing administrator can change roles, and nobody can change their own.
create function public.admin_set_user_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.app_role;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own role'; end if;
  select role into v_before from public.profiles where id = p_user_id;
  if v_before is null then raise exception 'user not found'; end if;
  update public.profiles set role = p_role where id = p_user_id;
  if p_role = 'admin' then
    perform private.write_audit('user.role.granted_admin', 'profile', p_user_id::text,
      jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));
  else
    perform private.write_audit('user.role.changed', 'profile', p_user_id::text,
      jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));
  end if;
end; $$;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

create function public.admin_set_user_status(p_user_id uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own account status'; end if;
  update public.profiles set status = p_status where id = p_user_id;
  perform private.write_audit('user.status.' || p_status::text, 'profile', p_user_id::text, null,
    jsonb_build_object('status', p_status));
end; $$;
grant execute on function public.admin_set_user_status(uuid, public.account_status) to authenticated;

create function public.admin_upsert_coupon(p_code text, p_type public.coupon_type, p_value bigint,
  p_currency char(3), p_min_order_minor bigint, p_max_redemptions integer,
  p_starts_at timestamptz, p_ends_at timestamptz, p_is_active boolean, p_description text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_code is null or trim(p_code) = '' then raise exception 'a code is required'; end if;
  if p_type = 'percentage' and (p_value <= 0 or p_value > 10000) then
    raise exception 'a percentage coupon needs a value between 1 and 10000 bps';
  end if;
  insert into public.coupons (code, description, type, value, currency, min_order_minor,
                              max_redemptions, starts_at, ends_at, is_active)
  values (upper(trim(p_code)), p_description, p_type, p_value, p_currency,
          coalesce(p_min_order_minor,0), p_max_redemptions, coalesce(p_starts_at, now()),
          p_ends_at, coalesce(p_is_active, true))
  on conflict (code) do update
    set description = excluded.description, type = excluded.type, value = excluded.value,
        currency = excluded.currency, min_order_minor = excluded.min_order_minor,
        max_redemptions = excluded.max_redemptions, starts_at = excluded.starts_at,
        ends_at = excluded.ends_at, is_active = excluded.is_active
  returning id into v_id;
  perform private.write_audit('coupon.upsert', 'coupon', v_id::text, null, jsonb_build_object('code', p_code));
  return v_id;
end; $$;
grant execute on function public.admin_upsert_coupon(text, public.coupon_type, bigint, char, bigint, integer, timestamptz, timestamptz, boolean, text) to authenticated;

create function public.admin_update_settings(p_patch jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before jsonb;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select to_jsonb(ps) into v_before from public.platform_settings ps where id;
  update public.platform_settings set
    platform_fee_bps = coalesce((p_patch->>'platform_fee_bps')::integer, platform_fee_bps),
    payout_minimum_minor = coalesce((p_patch->>'payout_minimum_minor')::bigint, payout_minimum_minor),
    reserve_hold_days = coalesce((p_patch->>'reserve_hold_days')::integer, reserve_hold_days),
    refund_window_days = coalesce((p_patch->>'refund_window_days')::integer, refund_window_days),
    download_url_ttl_seconds = coalesce((p_patch->>'download_url_ttl_seconds')::integer, download_url_ttl_seconds),
    payments_mode = coalesce(p_patch->>'payments_mode', payments_mode),
    price_rounding = coalesce(p_patch->>'price_rounding', price_rounding),
    support_email = coalesce(p_patch->>'support_email', support_email),
    updated_at = now()
  where id;
  perform private.write_audit('settings.update', 'platform_settings', 'singleton', v_before,
    (select to_jsonb(ps) from public.platform_settings ps where id));
end; $$;
grant execute on function public.admin_update_settings(jsonb) to authenticated;

