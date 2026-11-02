-- 0013 author_earnings returned numeric where bigint was declared (42804).
-- Aggregates over bigint columns are numeric in Postgres, so every expression
-- is cast explicitly.
create or replace function public.author_earnings(p_currency char(3) default 'NGN')
returns table (currency char(3), pending_minor bigint, available_minor bigint,
               lifetime_minor bigint, paid_minor bigint)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_author uuid := public.current_author_id(); v_hold integer; v_net bigint; v_pending bigint;
begin
  if v_author is null then return; end if;
  select reserve_hold_days into v_hold from public.platform_settings where id;

  select coalesce(sum(case le.direction when 'credit' then le.amount_minor else -le.amount_minor end), 0)::bigint,
         coalesce(sum(case le.direction when 'credit' then le.amount_minor else -le.amount_minor end)
                  filter (where le.direction = 'credit'
                          and le.created_at > now() - make_interval(days => v_hold)), 0)::bigint
    into v_net, v_pending
  from public.ledger_entries le
  join public.ledger_transactions lt on lt.id = le.transaction_id
  where le.author_id = v_author and le.currency = p_currency
    and le.account_type = 'author_payable' and lt.kind in ('sale','refund','chargeback','adjustment');

  return query select p_currency,
    v_pending,
    greatest(v_net - v_pending - coalesce((
      select sum(w.amount_minor) from public.withdrawals w
      where w.author_id = v_author and w.currency = p_currency
        and w.status in ('requested','under_review','approved','processing')), 0)::bigint, 0::bigint),
    coalesce((
      select sum(le2.amount_minor) from public.ledger_entries le2
      where le2.author_id = v_author and le2.currency = p_currency
        and le2.account_type = 'author_payable' and le2.direction = 'credit'), 0)::bigint,
    coalesce((
      select sum(w2.amount_minor) from public.withdrawals w2
      where w2.author_id = v_author and w2.currency = p_currency and w2.status = 'paid'), 0)::bigint;
end; $$;
