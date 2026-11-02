-- 0008d Manual payouts and refunds (ledger-reversing)
create function public.admin_record_payout(p_withdrawal_id uuid, p_method text, p_reference text,
                                           p_amount_minor bigint, p_paid_at timestamptz default now())
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_w public.withdrawals; v_id uuid;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if v_w.id is null then raise exception 'withdrawal not found'; end if;
  if v_w.status not in ('approved','processing') then
    raise exception 'a payout can only be recorded for an approved withdrawal (%)', v_w.status;
  end if;
  if p_amount_minor <> v_w.amount_minor then
    raise exception 'payout amount must equal the approved withdrawal amount';
  end if;
  if coalesce(trim(p_reference),'') = '' then raise exception 'a payout reference is required'; end if;

  insert into public.payout_records (withdrawal_id, amount_minor, currency, method, reference, status,
                                     paid_at, recorded_by)
  values (p_withdrawal_id, p_amount_minor, v_w.currency, p_method, p_reference, 'recorded', p_paid_at, auth.uid())
  returning id into v_id;

  perform public.admin_transition_withdrawal(p_withdrawal_id, 'paid', 'Paid manually: ' || p_method || ' / ' || p_reference);
  update public.payout_records set status = 'confirmed' where id = v_id;
  return v_id;
end; $$;
grant execute on function public.admin_record_payout(uuid, text, text, bigint, timestamptz) to authenticated;

create function public.admin_record_refund(p_order_id uuid, p_amount_minor bigint, p_reason text,
                                           p_provider_refund_id text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order public.orders; v_pay public.payments; v_id uuid; v_txn uuid;
  v_ratio numeric; v_author_credits bigint; v_author_debit bigint; v_commission_debit bigint; v_full boolean;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  if p_amount_minor <= 0 then raise exception 'refund amount must be positive'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'a reason is required'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order not found'; end if;
  select * into v_pay from public.payments where order_id = p_order_id and status in ('succeeded','partially_refunded')
  order by created_at desc limit 1;
  if v_pay.id is null then raise exception 'this order has no successful payment'; end if;
  if p_amount_minor > v_pay.amount_minor then raise exception 'refund exceeds the amount paid'; end if;

  v_full := p_amount_minor >= v_pay.amount_minor;
  v_ratio := p_amount_minor::numeric / v_pay.amount_minor;

  insert into public.refunds (payment_id, order_id, amount_minor, currency, status, reason,
                              provider_refund_id, requested_by, approved_by)
  values (v_pay.id, p_order_id, p_amount_minor, v_pay.currency,
          case when p_provider_refund_id is null then 'approved' else 'completed' end,
          p_reason, p_provider_refund_id, auth.uid(), auth.uid())
  returning id into v_id;

  insert into public.ledger_transactions (kind, order_id, payment_id, refund_id, currency, base_currency,
                                          fx_rate, memo, idempotency_key, system_generated)
  values ('refund', p_order_id, v_pay.id, v_id, v_pay.currency, coalesce(v_order.base_currency, v_pay.currency),
          coalesce(v_order.fx_rate_to_base, 1), 'Refund ' || v_id::text, 'refund:' || v_id::text, true)
  returning id into v_txn;

  select coalesce(sum(amount_minor), 0) into v_author_credits from public.ledger_entries
  where transaction_id = (select id from public.ledger_transactions
                          where payment_id = v_pay.id and kind = 'sale' limit 1)
    and account_type = 'author_payable';
  v_author_debit := 0;

  insert into public.ledger_entries (transaction_id, account_type, direction, amount_minor, currency, memo)
  values (v_txn, 'payment_clearing', 'credit', p_amount_minor, v_pay.currency, 'Refund to reader');
  if coalesce(v_author_credits,0) > 0 then
    insert into public.ledger_entries (transaction_id, account_type, author_id, direction, amount_minor, currency, memo)
    select v_txn, 'author_payable', le.author_id, 'debit',
           least(round(le.amount_minor * v_ratio)::bigint, p_amount_minor),
           v_pay.currency, 'Author share reversed by refund'
    from public.ledger_entries le
    where le.transaction_id = (select id from public.ledger_transactions where payment_id = v_pay.id and kind='sale' limit 1)
      and le.account_type = 'author_payable';
  end if;
  select coalesce(sum(amount_minor),0) into v_author_debit from public.ledger_entries
   where transaction_id = v_txn and account_type = 'author_payable';
  v_commission_debit := greatest(p_amount_minor - v_author_debit, 0);
  if v_commission_debit > 0 then
    insert into public.ledger_entries (transaction_id, account_type, direction, amount_minor, currency, memo)
    values (v_txn, 'platform_revenue', 'debit', v_commission_debit, v_pay.currency, 'Commission reversed by refund');
  end if;

  update public.payments set status = case when v_full then 'refunded' else 'partially_refunded' end
   where id = v_pay.id;
  update public.orders set status = case when v_full then 'refunded' else 'partially_refunded' end
   where id = p_order_id;
  update public.refunds set completed_at = now() where id = v_id;

  if v_full then
    update public.entitlements set revoked_at = now(), revoke_reason = 'order refunded: ' || p_reason
     where order_id = p_order_id and revoked_at is null;
  end if;

  perform private.notify_user(v_order.reader_id, 'system', 'Refund recorded',
    'A refund of ' || p_amount_minor || ' ' || v_pay.currency || ' was recorded for order ' ||
    v_order.order_number || '.', '/dashboard/orders');
  perform private.write_audit('refund.recorded', 'order', p_order_id::text, null,
    jsonb_build_object('amount', p_amount_minor, 'currency', v_pay.currency, 'reason', p_reason, 'full', v_full));
  return v_id;
end; $$;
grant execute on function public.admin_record_refund(uuid, bigint, text, text) to authenticated;
