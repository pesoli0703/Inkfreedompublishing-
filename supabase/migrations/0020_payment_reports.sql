-- 0020 Reporting functions for verified money.
-- Both are SECURITY DEFINER but disclose nothing to the caller beyond what their
-- own role may already read: the admin report refuses non-admins, and the author
-- report is scoped to current_author_id(). Currencies are never summed together.

create or replace function public.admin_payments_report()
returns table (
  currency char(3),
  verified_payments bigint,
  gross_minor bigint,
  gateway_fee_minor bigint,
  settlement_minor bigint,
  platform_commission_minor bigint,
  author_earnings_minor bigint,
  pending_payments bigint,
  failed_payments bigint,
  refunded_minor bigint
)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'administrator only' using errcode = '42501';
  end if;

  return query
  with codes as (
    select distinct p.currency as code from public.payments p
  ),
  pay as (
    select p.currency,
           count(*) filter (where p.status = 'succeeded') as verified,
           coalesce(sum(p.amount_minor) filter (where p.status = 'succeeded'), 0)::bigint as gross,
           coalesce(sum(p.gateway_fee_minor) filter (where p.status = 'succeeded'), 0)::bigint as fees,
           coalesce(sum(p.settlement_amount_minor) filter (where p.status = 'succeeded'), 0)::bigint as settled,
           count(*) filter (where p.status in ('initiated','pending')) as pending,
           count(*) filter (where p.status = 'failed') as failed
    from public.payments p
    group by p.currency
  ),
  ledger as (
    select le.currency,
           coalesce(sum(le.amount_minor) filter (where le.account_type = 'platform_revenue'), 0)::bigint as commission,
           coalesce(sum(le.amount_minor) filter (where le.account_type = 'author_payable'), 0)::bigint as author_share
    from public.ledger_entries le
    join public.ledger_transactions lt on lt.id = le.transaction_id and lt.kind = 'sale'
    where le.direction = 'credit'
    group by le.currency
  ),
  refunded as (
    select r.currency, coalesce(sum(r.amount_minor), 0)::bigint as amount
    from public.refunds r
    where r.status = 'completed'
    group by r.currency
  )
  select c.code,
         coalesce(pay.verified, 0),
         coalesce(pay.gross, 0),
         coalesce(pay.fees, 0),
         coalesce(pay.settled, 0),
         coalesce(ledger.commission, 0),
         coalesce(ledger.author_share, 0),
         coalesce(pay.pending, 0),
         coalesce(pay.failed, 0),
         coalesce(refunded.amount, 0)
  from codes c
  left join pay on pay.currency = c.code
  left join ledger on ledger.currency = c.code
  left join refunded on refunded.currency = c.code
  order by c.code;
end; $$;

revoke all on function public.admin_payments_report() from public, anon;
grant execute on function public.admin_payments_report() to authenticated, service_role;

create or replace function public.author_sales_report()
returns table (
  currency char(3),
  verified_sales bigint,
  gross_minor bigint,
  platform_commission_minor bigint,
  author_share_minor bigint,
  available_minor bigint,
  reserve_minor bigint,
  paid_out_minor bigint
)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare v_author uuid := public.current_author_id();
begin
  if v_author is null then return; end if;

  return query
  with sale_lines as (
    select lt.currency,
           lt.order_id,
           sum(le.amount_minor) filter (where le.account_type = 'payment_clearing') as gross,
           sum(le.amount_minor) filter (where le.author_id = v_author and le.account_type = 'author_payable') as mine
    from public.ledger_transactions lt
    join public.ledger_entries le on le.transaction_id = lt.id
    where lt.kind = 'sale'
      and exists (select 1 from public.order_items oi
                  where oi.order_id = lt.order_id and oi.author_id = v_author)
    group by lt.currency, lt.order_id
  )
  select sale_lines.currency,
         count(*)::bigint,
         coalesce(sum(sale_lines.gross), 0)::bigint,
         coalesce(sum(sale_lines.gross - sale_lines.mine), 0)::bigint,
         coalesce(sum(sale_lines.mine), 0)::bigint,
         coalesce(ae.available_minor, 0),
         coalesce(ae.pending_minor, 0),
         coalesce(ae.paid_minor, 0)
  from sale_lines
  left join lateral public.author_earnings(sale_lines.currency) ae on true
  group by sale_lines.currency, ae.available_minor, ae.pending_minor, ae.paid_minor
  order by sale_lines.currency;
end; $$;

revoke all on function public.author_sales_report() from public, anon;
grant execute on function public.author_sales_report() to authenticated, service_role;
