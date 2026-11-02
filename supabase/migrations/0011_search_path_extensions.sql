-- 0011 Extensions on the function search_path.
-- citext and pgcrypto live in the `extensions` schema on Supabase. Functions
-- pinned to `set search_path = public, pg_temp` could not resolve the citext
-- type at call time (42704). Adding `extensions` is the documented Supabase
-- pattern and keeps the type available without schema-qualifying every column.
grant usage on schema extensions to anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', f.signature);
  end loop;
end $$;
