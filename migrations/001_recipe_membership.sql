-- Stage 1: prepare authorization without changing the existing recipes policy.
-- Safe to run before users are enrolled. This does NOT close public access yet.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.recipe_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipe_members_active_role_idx
  on public.recipe_members (active, role);

alter table public.recipe_members enable row level security;
revoke all on table public.recipe_members from public;
revoke all on table public.recipe_members from anon;
revoke insert, update, delete on table public.recipe_members from authenticated;
grant select on table public.recipe_members to authenticated;

drop policy if exists "members_read_own_membership" on public.recipe_members;
create policy "members_read_own_membership"
  on public.recipe_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.has_recipe_access(required_role text default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipe_members as member
    where member.user_id = (select auth.uid())
      and member.active
      and case
        when required_role = 'editor' then member.role = 'editor'
        else member.role in ('viewer', 'editor')
      end
  );
$$;

revoke all on function private.has_recipe_access(text) from public, anon;
grant execute on function private.has_recipe_access(text) to authenticated;

commit;
