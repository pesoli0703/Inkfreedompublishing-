-- 0019 Settlement bookkeeping and order immutability.
--
-- (a) settle_payment wrote its own payment_events row keyed on the gateway
--     transaction id. That collides with the row the webhook endpoint records
--     for the same transaction (payment_events has a unique index on
--     (provider, provider_event_id)) and it claimed signature_valid = true even
--     for server lookups. Receipt of a webhook is evidence about a signature;
--     settlement is not, so the event row now belongs to the endpoint only.
-- (b) An order's money must never move after it is placed: exchange-rate updates
--     must not retroactively change what a customer owes.
create or replace function public.settle_payment(p_payment_id uuid, p_provider_transaction_id text,
  p_verified_amount_minor bigint, p_verified_currency char(3), p_provider_status text,
  p_source public.verification_source, p_channel text default null,
  p_gateway_fee_minor bigint default null, p_raw jsonb default null)
returns text language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_pay public.payments; v_order public.orders; v_settings public.platform_settings;
  v_success boolean; v_commission bigint;
  v_txn uuid; v_item record; v_item_commission bigint; v_leftover bigint;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if v_pay.id is null then raise exception 'payment not found'; end if;
  if v_pay.status = 'succeeded' then return 'duplicate'; end if;
  select * into v_order from public.orders where id = v_pay.order_id for update;
  select * into v_settings from public.platform_settings where id;

  v_success := lower(coalesce(p_provider_status,'')) in ('successful','success','completed','succeeded');

  if not v_success
     or p_verified_amount_minor is distinct from v_pay.amount_minor
     or p_verified_currency is distinct from v_pay.currency then
    update public.payments
       set status = 'failed', provider_transaction_id = p_provider_transaction_id,
           channel = coalesce(p_channel, channel),
           verified_amount_minor = p_verified_amount_minor,
           verified_currency = p_verified_currency,
           verified_provider_status = p_provider_status,
           verified_at = now(), verification_source = p_source,
           reconciliation_attempts = reconciliation_attempts + 1,
           raw_response = p_raw
     where id = p_payment_id;
    update public.orders set status = 'failed' where id = v_order.id and status = 'pending_payment';
    perform private.notify_user(v_order.reader_id, 'payment_failed', 'Payment was not completed',
      'We did not receive a successful payment for order ' || v_order.order_number || '.', '/dashboard/orders');
    perform private.write_audit('payment.failed', 'payment', p_payment_id::text, null,
      jsonb_build_object('verified_amount', p_verified_amount_minor, 'verified_currency', p_verified_currency,
                         'expected_amount', v_pay.amount_minor, 'expected_currency', v_pay.currency,
                         'provider_status', p_provider_status));
    return 'failed';
  end if;

  update public.payments
     set status = 'succeeded', provider_transaction_id = p_provider_transaction_id,
         channel = coalesce(p_channel, channel),
         verified_amount_minor = p_verified_amount_minor,
         verified_currency = p_verified_currency,
         verified_provider_status = p_provider_status,
         verified_at = now(), verification_source = p_source,
         gateway_fee_minor = p_gateway_fee_minor,
         settlement_amount_minor = case when p_gateway_fee_minor is null then null
                                        else p_verified_amount_minor - p_gateway_fee_minor end,
         settlement_currency = p_verified_currency,
         reconciliation_attempts = reconciliation_attempts + 1,
         raw_response = p_raw
   where id = p_payment_id;

  update public.orders set status = 'fulfilled', paid_at = now(), fulfilled_at = now()
   where id = v_order.id;

  for v_item in
    select oi.* from public.order_items oi
    where oi.order_id = v_order.id and oi.is_commissionable
  loop
    if not exists (select 1 from public.entitlements e where e.order_item_id = v_item.id) then
      insert into public.entitlements (reader_id, book_id, order_id, order_item_id, kind)
      values (v_order.reader_id, v_item.book_id, v_order.id, v_item.id, 'digital');
    end if;
  end loop;

  if exists (select 1 from public.ledger_transactions where idempotency_key = 'sale:' || p_payment_id::text) then
    return 'duplicate';
  end if;

  insert into public.ledger_transactions (kind, order_id, payment_id, currency, base_currency, fx_rate,
                                          commission_bps, memo, idempotency_key, system_generated)
  values ('sale', v_order.id, p_payment_id, v_pay.currency, v_settings.base_currency,
          coalesce(v_order.fx_rate_to_base, 1), v_settings.platform_fee_bps,
          'Sale for order ' || v_order.order_number, 'sale:' || p_payment_id::text, true)
  returning id into v_txn;

  insert into public.ledger_entries (transaction_id, account_type, direction, amount_minor, currency,
                                     base_amount_minor, memo)
  values (v_txn, 'payment_clearing', 'debit', v_pay.amount_minor, v_pay.currency,
          v_order.base_total_minor, 'Payment received ' || coalesce(p_provider_transaction_id,''));

  v_commission := 0;
  for v_item in
    select author_id, sum(coalesce(line_total_minor, unit_price_minor * quantity)) as line_total,
           bool_or(is_commissionable) as commissionable
    from public.order_items where order_id = v_order.id group by author_id
  loop
    v_item_commission := case when v_item.commissionable
      then round(v_item.line_total::numeric * v_settings.platform_fee_bps / 10000.0)::bigint else 0 end;
    v_commission := v_commission + v_item_commission;
    if v_item.author_id is not null and (v_item.line_total - v_item_commission) > 0 then
      insert into public.ledger_entries (transaction_id, account_type, author_id, direction, amount_minor,
                                         currency, base_amount_minor, memo)
      values (v_txn, 'author_payable', v_item.author_id, 'credit',
              v_item.line_total - v_item_commission, v_pay.currency,
              round((v_item.line_total - v_item_commission)::numeric * coalesce(v_order.fx_rate_to_base,1))::bigint,
              'Author share, order ' || v_order.order_number);
    end if;
  end loop;

  insert into public.ledger_entries (transaction_id, account_type, direction, amount_minor, currency,
                                     base_amount_minor, memo)
  values (v_txn, 'platform_revenue', 'credit', v_commission, v_pay.currency,
          round(v_commission::numeric * coalesce(v_order.fx_rate_to_base,1))::bigint,
          'Platform commission at ' || v_settings.platform_fee_bps || ' bps');

  select v_pay.amount_minor - v_commission - coalesce(sum(amount_minor) filter (where account_type = 'author_payable'),0)
    into v_leftover from public.ledger_entries where transaction_id = v_txn;
  if coalesce(v_leftover, 0) <> 0 then
    insert into public.ledger_entries (transaction_id, account_type, direction, amount_minor, currency, memo)
    values (v_txn, 'adjustments', case when v_leftover > 0 then 'credit' else 'debit' end,
            abs(v_leftover), v_pay.currency, 'Rounding adjustment to balance sale');
  end if;

  perform private.notify_user(v_order.reader_id, 'payment_succeeded', 'Payment confirmed',
    'Your payment for order ' || v_order.order_number || ' was confirmed.', '/dashboard/orders');
  perform private.notify_user(v_order.reader_id, 'purchase', 'Your books are ready',
    'Your purchase is in your library. Downloads stay available for seven days after each request; your access does not expire.',
    '/dashboard/library');

  perform private.write_audit('payment.succeeded', 'payment', p_payment_id::text, null,
    jsonb_build_object('amount', p_verified_amount_minor, 'currency', p_verified_currency,
                       'source', p_source, 'provider_tx', p_provider_transaction_id,
                       'gateway_fee', p_gateway_fee_minor));
  return 'settled';
end; $$;

revoke all on function public.settle_payment(uuid,text,bigint,char(3),text,public.verification_source,text,bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_payment(uuid,text,bigint,char(3),text,public.verification_source,text,bigint,jsonb)
  to service_role;

create or replace function private.orders_money_is_immutable()
returns trigger language plpgsql as $$
begin
  if new.currency is distinct from old.currency
     or new.subtotal_minor is distinct from old.subtotal_minor
     or new.total_minor is distinct from old.total_minor
     or new.discount_minor is distinct from old.discount_minor
     or new.fx_rate_to_base is distinct from old.fx_rate_to_base then
    raise exception 'an order''s amounts and currency are fixed once placed'
      using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists orders_money_immutable on public.orders;
create trigger orders_money_immutable
  before update of currency, subtotal_minor, total_minor, discount_minor, fx_rate_to_base
  on public.orders for each row execute function private.orders_money_is_immutable();
