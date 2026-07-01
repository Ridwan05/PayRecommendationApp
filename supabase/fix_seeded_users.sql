-- Repair ALL auth.users rows that have NULL token columns. Directly inserting
-- into auth.users can leave these NULL, which makes GoTrue fail with
-- "Database error finding user" and 500 the auth API for EVERY user (one bad
-- row breaks the whole users query). This sets them to '' as GoTrue expects.
--
-- Run in Supabase Dashboard -> SQL Editor.
update auth.users
set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where
  confirmation_token is null
  or recovery_token is null
  or email_change is null
  or email_change_token_new is null
  or email_change_token_current is null
  or phone_change is null
  or phone_change_token is null
  or reauthentication_token is null;

-- Show what remains so we can confirm it's clean:
select id, email, created_at from auth.users order by created_at;
