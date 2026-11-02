-- 0010 Align payments_mode values with the application and unblock admin role changes
alter table public.platform_settings drop constraint if exists platform_settings_payments_mode_check;
alter table public.platform_settings add constraint platform_settings_payments_mode_check
  check (payments_mode in ('disabled','test','live','mock','flutterwave_sandbox','flutterwave_live'));

create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before public.app_role;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own role'; end if;
  select role into v_before from public.profiles where id = p_user_id;
  if v_before is null then raise exception 'user not found'; end if;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set role = p_role where id = p_user_id;
  perform set_config('app.privileged', 'off', true);
  perform private.write_audit('user.role.changed', 'profile', p_user_id::text,
    jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));
end; $$;

create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own account status'; end if;
  perform set_config('app.privileged', 'on', true);
  update public.profiles set status = p_status where id = p_user_id;
  perform set_config('app.privileged', 'off', true);
  perform private.write_audit('user.status.' || p_status::text, 'profile', p_user_id::text, null,
    jsonb_build_object('status', p_status));
end; $$;

-- Settings must never accept a payments mode the platform cannot honour.
create or replace function public.admin_update_settings(p_patch jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_before jsonb; v_mode text;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  v_mode := p_patch->>'payments_mode';
  if v_mode is not null and v_mode not in ('disabled','test','live') then
    raise exception 'payments_mode must be disabled, test or live';
  end if;
  select to_jsonb(ps) into v_before from public.platform_settings ps where id;
  update public.platform_settings set
    platform_fee_bps = coalesce((p_patch->>'platform_fee_bps')::integer, platform_fee_bps),
    payout_minimum_minor = coalesce((p_patch->>'payout_minimum_minor')::bigint, payout_minimum_minor),
    reserve_hold_days = coalesce((p_patch->>'reserve_hold_days')::integer, reserve_hold_days),
    refund_window_days = coalesce((p_patch->>'refund_window_days')::integer, refund_window_days),
    download_url_ttl_seconds = coalesce((p_patch->>'download_url_ttl_seconds')::integer, download_url_ttl_seconds),
    payments_mode = coalesce(v_mode, payments_mode),
    price_rounding = coalesce(p_patch->>'price_rounding', price_rounding),
    support_email = coalesce(p_patch->>'support_email', support_email),
    updated_at = now()
  where id;
  perform private.write_audit('settings.update', 'platform_settings', 'singleton', v_before,
    (select to_jsonb(ps) from public.platform_settings ps where id));
end; $$;
