-- 0022 Self-publishing onboarding.
--
-- The marketplace is self-service: a signed-in reader can start publishing
-- immediately, with no editorial gate in front of the upload form. Book
-- approval is unchanged — an administrator still reviews every title before it
-- reaches the catalogue.
--
-- The author profile and the profile role are written inside one SECURITY
-- DEFINER function because `private.guard_profile_privileges` blocks role
-- changes made from the browser. The function can only ever act on the caller:
-- it takes no user id, and it refuses to grant the admin role or to touch
-- anyone else's account.

create or replace function public.start_self_publishing(
  p_pen_name text,
  p_tagline text default null,
  p_bio text default null,
  p_based_in text default null,
  p_country char(2) default null,
  p_writing_in text default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_slug text;
  v_existing public.author_profiles;
  v_author_id uuid;
  v_role public.app_role;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if coalesce(trim(p_pen_name), '') = '' then
    raise exception 'a pen name is required';
  end if;
  if length(trim(p_pen_name)) < 2 then
    raise exception 'the pen name must be at least two characters';
  end if;

  select role into v_role from public.profiles where id = v_uid;

  select * into v_existing from public.author_profiles where user_id = v_uid;

  if v_existing.id is not null and v_existing.status = 'suspended' then
    raise exception 'this publishing account is suspended' using errcode = '42501';
  end if;

  if v_existing.id is null then
    v_slug := lower(regexp_replace(trim(p_pen_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then v_slug := 'author'; end if;
    if exists (select 1 from public.author_profiles where slug = v_slug) then
      v_slug := v_slug || '-' || substr(replace(v_uid::text, '-', ''), 1, 6);
    end if;

    insert into public.author_profiles
      (user_id, slug, pen_name, tagline, bio, based_in, country_code, writing_in,
       status, approved_at)
    values
      (v_uid, v_slug, trim(p_pen_name), nullif(trim(p_tagline), ''), nullif(trim(p_bio), ''),
       nullif(trim(p_based_in), ''), p_country, nullif(trim(p_writing_in), ''),
       'approved', now())
    returning id into v_author_id;
  else
    -- Returning or previously-rejected author: open the workspace again.
    update public.author_profiles
       set status = 'approved',
           approved_at = coalesce(approved_at, now()),
           pen_name = coalesce(nullif(trim(p_pen_name), ''), pen_name)
     where id = v_existing.id
    returning id into v_author_id;
  end if;

  -- Authorship is granted to the caller only, and never downgrades an admin.
  if v_role <> 'admin' then
    perform set_config('app.privileged', 'on', true);
    update public.profiles set role = 'author' where id = v_uid and role <> 'author';
    perform set_config('app.privileged', 'off', true);
  end if;

  perform private.write_audit(
    'author.self_started', 'author_profile', v_author_id::text, null,
    jsonb_build_object('pen_name', trim(p_pen_name), 'approved_at', now())
  );

  perform private.notify_user(v_uid, 'system',
    'You can publish now',
    'Your author workspace is open. Create a book, upload your files and submit it for review.',
    '/author/books/new');

  return v_author_id;
end; $$;

grant execute on function public.start_self_publishing(text, text, text, text, char, text)
  to authenticated;

comment on function public.start_self_publishing(text, text, text, text, char, text) is
  'Self-service author onboarding: creates an approved author profile for the caller. Administrators still approve every book before publication.';
