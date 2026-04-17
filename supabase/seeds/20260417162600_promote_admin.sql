-- Replace EMAIL with your real admin account email.
-- Run after the user signs up in Supabase Auth.

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
  limit 1
);
