-- 0012 Break the orders <-> order_items policy recursion.
-- A policy on orders that subqueries order_items (which itself has a policy on
-- orders) makes Postgres raise 42P17. The lookups below run as the definer, so
-- the inner query does not re-enter RLS.
create or replace function private.is_order_reader(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from public.orders o where o.id = p_order_id and o.reader_id = auth.uid());
$$;

create or replace function private.is_order_author(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select exists (select 1 from public.order_items oi
                 where oi.order_id = p_order_id and oi.author_id = public.current_author_id());
$$;

grant execute on function private.is_order_reader(uuid) to authenticated;
grant execute on function private.is_order_author(uuid) to authenticated;

drop policy if exists orders_author_read on public.orders;
create policy orders_author_read on public.orders for select to authenticated
  using (private.is_order_author(orders.id));

drop policy if exists order_items_reader_read on public.order_items;
create policy order_items_reader_read on public.order_items for select to authenticated
  using (private.is_order_reader(order_items.order_id));

drop policy if exists payments_reader_read on public.payments;
create policy payments_reader_read on public.payments for select to authenticated
  using (private.is_order_reader(payments.order_id));

drop policy if exists refunds_reader_read on public.refunds;
create policy refunds_reader_read on public.refunds for select to authenticated
  using (private.is_order_reader(refunds.order_id));

drop policy if exists refunds_author_read on public.refunds;
create policy refunds_author_read on public.refunds for select to authenticated
  using (private.is_order_author(refunds.order_id));
