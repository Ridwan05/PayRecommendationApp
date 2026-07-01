-- =====================================================================
-- Prepopulate users + roles (passwordless / magic-link login).
-- Run once in Supabase Dashboard -> SQL Editor.
--
-- Because public.profiles.id references auth.users(id), each profile needs a
-- matching auth user. This script creates the auth user (email confirmed, no
-- password — login is via magic link) and its email identity, then upserts the
-- profile role. Safe to re-run: existing emails are skipped and roles re-synced.
--
-- EDIT the list below, then run.
-- =====================================================================
do $$
declare
  u record;
  uid uuid;
  people jsonb := '[
    {"email":"ryussuf@dreef.org","full_name":"Ridwan Yussuf","role":"admin"},
    {"email":"vbabalola@dreef.org","full_name":"Victor Babalola","role":"ceo"},
    {"email":"mbernard@dreef.org","full_name":"Mfon Bernard","role":"hr"}
  ]';
begin
  for u in
    select * from jsonb_to_recordset(people) as x(email text, full_name text, role text)
  loop
    -- Reuse the existing auth user if the email is already there.
    select id into uid from auth.users where lower(email) = lower(u.email);

    if uid is null then
      uid := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        -- These must be '' (not NULL) or GoTrue errors with
        -- "Database error finding user" when reading the row.
        confirmation_token, recovery_token, email_change,
        email_change_token_new, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', uid,
        'authenticated', 'authenticated', u.email, '',
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', u.full_name, 'role', u.role),
        '', '', '', '', '', '', '', ''
      );

      -- Email identity so the magic-link (email OTP) provider recognises them.
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid,
        jsonb_build_object('sub', uid::text, 'email', u.email),
        'email', u.email, now(), now(), now()
      );
    end if;

    -- The on_auth_user_created trigger may already have made the profile from
    -- metadata; this guarantees the role/name/email are exactly as listed.
    insert into public.profiles (id, email, full_name, role)
    values (uid, u.email, u.full_name, u.role::user_role)
    on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          role = excluded.role;
  end loop;
end $$;

-- Verify:
-- select email, full_name, role from public.profiles order by role;
