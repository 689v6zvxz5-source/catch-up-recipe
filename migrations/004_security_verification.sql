-- Read-only checks for SQL Editor after lockdown.

select role, active, count(*) as members
from public.recipe_members
group by role, active
order by role, active desc;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('recipes', 'recipe_members')
order by tablename, cmd, policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'recipes'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select count(*) as recipe_count
from public.recipes;
