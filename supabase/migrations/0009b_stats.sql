-- 0009b Admin and author dashboard statistics
create function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'administrator only' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'authors_approved', (select count(*) from public.author_profiles where status = 'approved'),
    'applications_pending', (select count(*) from public.author_applications where status = 'pending'),
    'books_published', (select count(*) from public.books where status = 'published'),
    'books_pending_review', (select count(*) from public.books where status = 'submitted'),
    'orders_total', (select count(*) from public.orders),
    'orders_paid', (select count(*) from public.orders where paid_at is not null),
    'gross_ngn_minor', (select coalesce(sum(total_minor),0) from public.orders
                        where paid_at is not null and currency = 'NGN'),
    'commission_ngn_minor', (select coalesce(sum(amount_minor),0) from public.ledger_entries
                             where account_type = 'platform_revenue' and direction = 'credit' and currency = 'NGN'),
    'author_payable_ngn_minor', (select coalesce(sum(case direction when 'credit' then amount_minor else -amount_minor end),0)
                                 from public.ledger_entries where account_type = 'author_payable' and currency = 'NGN'),
    'withdrawals_pending', (select count(*) from public.withdrawals where status in ('requested','under_review','approved','processing')),
    'withdrawals_pending_ngn_minor', (select coalesce(sum(amount_minor),0) from public.withdrawals
                                      where status in ('requested','under_review','approved','processing') and currency = 'NGN'),
    'support_open', (select count(*) from public.support_tickets where status in ('open','in_progress')),
    'copyright_open', (select count(*) from public.copyright_reports where status in ('received','under_review')),
    'reviews_pending', (select count(*) from public.reviews where status = 'pending'),
    'payments_mode', (select payments_mode from public.platform_settings where id)
  ) into v;
  return v;
end; $$;
grant execute on function public.admin_stats() to authenticated;

create function public.author_stats()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_author uuid := public.current_author_id(); v jsonb;
begin
  if v_author is null then return null; end if;
  select jsonb_build_object(
    'books_total', (select count(*) from public.books where author_id = v_author),
    'books_published', (select count(*) from public.books where author_id = v_author and status = 'published'),
    'books_in_review', (select count(*) from public.books where author_id = v_author and status = 'submitted'),
    'books_changes_requested', (select count(*) from public.books where author_id = v_author and status = 'changes_requested'),
    'sales_count', (select coalesce(sum(oi.quantity),0) from public.order_items oi
                    join public.orders o on o.id = oi.order_id
                    where oi.author_id = v_author and o.paid_at is not null),
    'earnings', (select coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb) from public.author_earnings('NGN') e),
    'withdrawals_open', (select count(*) from public.withdrawals where author_id = v_author
                         and status in ('requested','under_review','approved','processing'))
  ) into v;
  return v;
end; $$;
grant execute on function public.author_stats() to authenticated;
