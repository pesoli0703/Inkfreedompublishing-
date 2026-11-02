-- 0008c Download reservations, author earnings, withdrawals
create function public.issue_download(p_book_file_id uuid)
returns table (bucket text, path text, expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_file public.book_files; v_ent public.entitlements; v_ttl integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select download_url_ttl_seconds into v_ttl from public.platform_settings where id;

  select bf.* into v_file from public.book_files bf where bf.id = p_book_file_id and bf.is_current;
  if v_file.id is null then raise exception 'file not found'; end if;
  if v_file.kind = 'sample' then raise exception 'samples are served from the public catalogue'; end if;

  select e.* into v_ent from public.entitlements e
  where e.reader_id = auth.uid() and e.book_id = v_file.book_id and e.revoked_at is null;
  if v_ent.id is null then
    raise exception 'you do not own this book' using errcode = '42501';
  end if;

  insert into public.download_events (entitlement_id, user_id, book_file_id, expires_at)
  values (v_ent.id, auth.uid(), v_file.id, now() + make_interval(secs => v_ttl));

  return query select v_file.storage_bucket, v_file.storage_path,
                      now() + make_interval(secs => v_ttl);
end; $$;
grant execute on function public.issue_download(uuid) to authenticated;

create function public.author_earnings(p_currency char(3) default 'NGN')
returns table (currency char(3), pending_minor bigint, available_minor bigint,
               lifetime_minor bigint, paid_minor bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_author uuid := public.current_author_id(); v_hold integer; v_pending bigint;
begin
  if v_author is null then return; end if;
  select reserve_hold_days into v_hold from public.platform_settings where id;

  select coalesce(sum(case le.direction when 'credit' then le.amount_minor else -le.amount_minor end), 0),
         coalesce(sum(case le.direction when 'credit' then le.amount_minor else -le.amount_minor end)
                  filter (where le.direction = 'credit' and le.created_at > now() - make_interval(days => v_hold)), 0)
    into pending_minor, v_pending
  from public.ledger_entries le
  join public.ledger_transactions lt on lt.id = le.transaction_id
  where le.author_id = v_author and le.currency = p_currency
    and le.account_type = 'author_payable' and lt.kind in ('sale','refund','chargeback','adjustment');

  return query select p_currency,
    v_pending,
    greatest(pending_minor - v_pending - coalesce((
      select sum(w.amount_minor) from public.withdrawals w
      where w.author_id = v_author and w.currency = p_currency
        and w.status in ('requested','under_review','approved','processing')), 0), 0),
    coalesce((
      select sum(le2.amount_minor) from public.ledger_entries le2
      where le2.author_id = v_author and le2.currency = p_currency
        and le2.account_type = 'author_payable' and le2.direction = 'credit'), 0),
    coalesce((
      select sum(w2.amount_minor) from public.withdrawals w2
      where w2.author_id = v_author and w2.currency = p_currency and w2.status = 'paid'), 0);
end; $$;
grant execute on function public.author_earnings(char) to authenticated;

create function public.request_withdrawal(p_amount_minor bigint, p_payout_account_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_author uuid := public.current_author_id(); v_acct public.payout_accounts;
  v_min bigint; v_base char(3); v_avail record; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if v_author is null then raise exception 'only approved authors can withdraw' using errcode = '42501'; end if;
  select payout_minimum_minor, base_currency into v_min, v_base from public.platform_settings where id;

  select * into v_acct from public.payout_accounts where id = p_payout_account_id and author_id = v_author;
  if v_acct.id is null then raise exception 'payout account not found'; end if;
  if p_amount_minor < v_min then
    raise exception 'the minimum withdrawal is % minor units of %', v_min, v_base;
  end if;

  select * into v_avail from public.author_earnings(v_base);
  if p_amount_minor > coalesce(v_avail.available_minor, 0) then
    raise exception 'requested amount exceeds your available balance (% available)', coalesce(v_avail.available_minor,0);
  end if;

  insert into public.withdrawals (author_id, payout_account_id, requested_by, amount_minor, currency, status)
  values (v_author, v_acct.id, auth.uid(), p_amount_minor, v_base, 'requested')
  returning id into v_id;

  insert into public.withdrawal_events (withdrawal_id, to_status, actor_id, note)
  values (v_id, 'requested', auth.uid(), 'Requested by author');

  perform private.notify_user(auth.uid(), 'withdrawal_requested', 'Withdrawal requested',
    'We have received your withdrawal request. Payouts are reviewed and paid manually.', '/author/earnings');
  perform private.write_audit('withdrawal.requested', 'withdrawal', v_id::text, null,
    jsonb_build_object('amount', p_amount_minor, 'currency', v_base));
  return v_id;
end; $$;
grant execute on function public.request_withdrawal(bigint, uuid) to authenticated;

-- Single admin transition function: requested -> under_review -> approved -> processing
-- -> paid, or rejected/failed at any point. Approving posts the payout ledger entry.
create function public.admin_transition_withdrawal(p_withdrawal_id uuid, p_to public.withdrawal_status,
                                                   p_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_w public.withdrawals;
  v_allowed boolean; v_txn uuid;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if v_w.id is null then raise exception 'withdrawal not found'; end if;

  v_allowed := case v_w.status
    when 'requested' then p_to in ('under_review','approved','rejected','cancelled')
    when 'under_review' then p_to in ('approved','rejected')
    when 'approved' then p_to in ('processing','rejected','failed')
    when 'processing' then p_to in ('paid','failed')
    else false end;
  if not v_allowed then
    raise exception 'cannot move a withdrawal from % to %', v_w.status, p_to;
  end if;
  if p_to in ('rejected','failed') and coalesce(trim(p_note),'') = '' then
    raise exception 'a note is required when rejecting or failing a withdrawal';
  end if;

  if p_to = 'approved' then
    if not exists (select 1 from public.ledger_transactions where idempotency_key = 'payout:' || p_withdrawal_id::text) then
      insert into public.ledger_transactions (kind, withdrawal_id, currency, base_currency, fx_rate, memo,
                                              idempotency_key, system_generated)
      values ('payout', p_withdrawal_id, v_w.currency, v_w.currency, 1,
              'Withdrawal approved', 'payout:' || p_withdrawal_id::text, true)
      returning id into v_txn;
      insert into public.ledger_entries (transaction_id, account_type, author_id, direction, amount_minor, currency, memo)
      values (v_txn, 'author_payable', v_w.author_id, 'debit', v_w.amount_minor, v_w.currency,
              'Withdrawal ' || p_withdrawal_id::text),
             (v_txn, 'payout_clearing', null, 'credit', v_w.amount_minor, v_w.currency,
              'Withdrawal ' || p_withdrawal_id::text);
    end if;
  end if;

  update public.withdrawals set status = p_to,
    reviewed_by = case when p_to in ('under_review','approved') then auth.uid() else reviewed_by end,
    reviewed_at = case when p_to = 'under_review' then now() else reviewed_at end,
    approved_at = case when p_to = 'approved' then now() else approved_at end,
    paid_at = case when p_to = 'paid' then now() else paid_at end,
    ledger_transaction_id = coalesce(v_txn, ledger_transaction_id),
    failure_reason = case when p_to in ('rejected','failed') then p_note else failure_reason end
  where id = p_withdrawal_id;

  insert into public.withdrawal_events (withdrawal_id, from_status, to_status, actor_id, note)
  values (p_withdrawal_id, v_w.status, p_to, auth.uid(), p_note);

  perform private.notify_user(v_w.author_id,
    case when p_to = 'paid' then 'withdrawal_paid'::public.notification_type
         when p_to = 'approved' then 'withdrawal_approved'::public.notification_type
         else 'withdrawal_requested'::public.notification_type end,
    case when p_to = 'paid' then 'Withdrawal paid'
         when p_to = 'approved' then 'Withdrawal approved'
         else 'Withdrawal update: ' || p_to::text end,
    coalesce(p_note, ''), '/author/earnings');

  perform private.write_audit('withdrawal.' || p_to::text, 'withdrawal', p_withdrawal_id::text,
    jsonb_build_object('status', v_w.status), jsonb_build_object('status', p_to, 'note', p_note));
end; $$;
grant execute on function public.admin_transition_withdrawal(uuid, public.withdrawal_status, text) to authenticated;

