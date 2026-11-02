-- Readers may open a pending order for themselves, and add its items.
-- Only the server (service role) can mark an order paid or grant entitlements.

drop policy if exists ink_orders_insert on public.ink_orders;
create policy ink_orders_insert on public.ink_orders for insert to authenticated
  with check (reader_id = auth.uid() and status = 'pending');

drop policy if exists ink_orders_update_own_pending on public.ink_orders;
create policy ink_orders_update_own_pending on public.ink_orders for update to authenticated
  using (reader_id = auth.uid() and status = 'pending')
  with check (reader_id = auth.uid() and status = 'pending');

drop policy if exists ink_order_items_insert on public.ink_order_items;
create policy ink_order_items_insert on public.ink_order_items for insert to authenticated
  with check (
    order_id in (
      select o.id from public.ink_orders o
      where o.reader_id = auth.uid() and o.status = 'pending'
    )
  );

-- The split must add up to the unit price.
alter table public.ink_order_items drop constraint if exists ink_order_items_split_check;
alter table public.ink_order_items add constraint ink_order_items_split_check
  check (platform_fee_kobo + author_share_kobo = unit_price_kobo);

-- A reader may promote themselves to author (opening a studio). Only an
-- administrator can grant or remove any other role.
create or replace function public.ink_guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if not public.ink_is_admin() then
      if not (old.role = 'reader' and new.role = 'author') then
        raise exception 'role changes require an administrator';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
