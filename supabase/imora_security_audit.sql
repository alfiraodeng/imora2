-- Read-only IMORA security audit. Run in Supabase SQL Editor after
-- imora_owner_data_isolation.sql to confirm RLS and policies in one view.

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

select
  tablename as table_name,
  policyname as policy_name,
  cmd as operation,
  roles,
  qual as using_rule,
  with_check as with_check_rule
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
