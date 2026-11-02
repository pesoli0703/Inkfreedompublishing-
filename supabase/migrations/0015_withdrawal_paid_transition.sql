-- 0015 An approved withdrawal may be paid directly (manual payout), so the
-- state machine must allow approved -> paid as well as approved -> processing.
-- (Supersedes the body in 0014.)
-- 0014 withdrawals.author_id references author_profiles(id); notifications are
-- keyed by profiles(id). The notification therefore has to resolve the owner's
-- user id first, otherwise the insert violates notifications_user_id_fkey.
create or replace function public.admin_transition_withdrawal(p_withdrawal_id uuid, p_to public.withdrawal_status,
                                                   p_note text default null)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_w public.withdrawals;
  v_allowed boolean; v_txn uuid; v_owner uuid;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if v_w.id is null then raise exception 'withdrawal not found'; end if;

  v_allowed := case v_w.status
    when 'requested' then p_to in ('under_review','approved','rejected','cancelled')
    when 'under_review' then p_to in ('approved','rejected')
    when 'approved' then p_to in ('processing','paid','rejected','failed')
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

  select ap.user_id into v_owner from public.author_profiles ap where ap.id = v_w.author_id;
  if v_owner is not null then
    perform private.notify_user(v_owner,
      case when p_to = 'paid' then 'withdrawal_paid'::public.notification_type
           when p_to = 'approved' then 'withdrawal_approved'::public.notification_type
           else 'withdrawal_requested'::public.notification_type end,
      case when p_to = 'paid' then 'Withdrawal paid'
           when p_to = 'approved' then 'Withdrawal approved'
           else 'Withdrawal update: ' || p_to::text end,
      coalesce(p_note, ''), '/author/earnings');
  end if;

  perform private.write_audit('withdrawal.' || p_to::text, 'withdrawal', p_withdrawal_id::text,
    jsonb_build_object('status', v_w.status), jsonb_build_object('status', p_to, 'note', p_note));
end; $$;
