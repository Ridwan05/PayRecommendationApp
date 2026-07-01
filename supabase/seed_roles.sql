-- After you create users in Supabase Dashboard (Authentication -> Users),
-- assign roles by email. Run this in the SQL Editor and edit the emails.

update public.profiles set role = 'admin' where email = 'ryussuf@dreef.org';
update public.profiles set role = 'ceo'   where email = 'cazubike@infracredit.ng';
update public.profiles set role = 'hr'    where email = 'mbernard@dreef.org';

-- Verify:
-- select email, role from public.profiles order by role;
