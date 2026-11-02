-- 0006 Row Level Security: deny by default, explicit policies per operation
create policy withdrawals_author_read on public.withdrawals for select to authenticated
  using (author_id = public.current_author_id() or public.is_admin());
create policy withdrawal_events_read on public.withdrawal_events for select to authenticated
  using (exists (select 1 from public.withdrawals w where w.id = withdrawal_id
                 and (w.author_id = public.current_author_id() or public.is_admin())));
create policy payout_records_read on public.payout_records for select to authenticated
  using (exists (select 1 from public.withdrawals w where w.id = withdrawal_id
                 and (w.author_id = public.current_author_id() or public.is_admin())));

create policy ledger_transactions_author_read on public.ledger_transactions for select to authenticated
  using (public.is_admin() or exists (select 1 from public.ledger_entries e
    where e.transaction_id = ledger_transactions.id and e.author_id = public.current_author_id()));
create policy ledger_entries_author_read on public.ledger_entries for select to authenticated
  using (author_id = public.current_author_id() or public.is_admin());

create policy audit_log_admin_read on public.audit_log for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------ grants
revoke all on all tables in schema public from anon;
grant select on public.categories, public.currencies, public.fx_rates,
                public.books, public.book_categories, public.book_formats, public.book_prices,
                public.book_price_overrides, public.book_contributors, public.author_profiles,
                public.published_books, public.published_book_offers, public.reviews
  to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.copyright_reports to anon;

-- privileged tables: read-only for API roles, written by SECURITY DEFINER functions only
revoke insert, update, delete on public.ledger_entries, public.ledger_transactions,
       public.audit_log, public.payment_events, public.book_moderation_events,
       public.withdrawal_events, public.payout_records, public.orders, public.order_items,
       public.payments, public.entitlements, public.notifications, public.download_events,
       public.coupon_redemptions, public.withdrawals, public.refunds, public.book_price_overrides,
       public.platform_settings, public.currencies, public.fx_rates, public.categories,
       public.book_moderation_events
  from authenticated;
revoke delete on public.books, public.book_files, public.book_formats, public.book_prices,
       public.author_applications, public.profiles, public.reviews from authenticated;

-- column-level protection
revoke update on public.profiles from authenticated;
grant update (full_name, display_name, avatar_path, phone, country_code,
              preferred_currency, marketing_opt_in) on public.profiles to authenticated;
revoke update on public.author_profiles from authenticated;
grant update (pen_name, tagline, bio, based_in, country_code, writing_in, avatar_path)
  on public.author_profiles to authenticated;
revoke update on public.books from authenticated;
grant update (primary_category_id, slug, title, subtitle, hook, description_paragraphs,
              excerpt_label, excerpt_body, themes, keywords, language, page_count,
              publication_date, cover_path, rights_declared_at, status)
  on public.books to authenticated;
revoke update on public.withdrawals from authenticated;
revoke update on public.author_applications from authenticated;

create or replace view public.app_config with (security_invoker = false) as
select base_currency, platform_fee_bps, payout_minimum_minor, reserve_hold_days,
       refund_window_days, download_url_ttl_seconds, payments_mode, price_rounding,
       legal_brand_name, legal_parent_name, legal_registration_type, support_email
from public.platform_settings where id;
grant select on public.app_config to anon, authenticated;
