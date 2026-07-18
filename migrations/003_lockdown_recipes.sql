-- Stage 3: close anonymous access. Run only after membership is verified.

begin;

do $$
begin
  if not exists (
    select 1 from public.recipe_members
    where active and role = 'editor'
  ) then
    raise exception 'Lockdown aborted: add at least one active editor first';
  end if;
end
$$;

alter table public.recipes enable row level security;

revoke all on table public.recipes from public;
revoke all on table public.recipes from anon;
grant select, insert, update, delete on table public.recipes to authenticated;

drop policy if exists "catchup_all" on public.recipes;
drop policy if exists "recipe_members_can_read" on public.recipes;
drop policy if exists "recipe_editors_can_insert" on public.recipes;
drop policy if exists "recipe_editors_can_update" on public.recipes;
drop policy if exists "recipe_editors_can_delete" on public.recipes;

create policy "recipe_members_can_read"
  on public.recipes
  for select
  to authenticated
  using ((select private.has_recipe_access('viewer')));

create policy "recipe_editors_can_insert"
  on public.recipes
  for insert
  to authenticated
  with check ((select private.has_recipe_access('editor')));

create policy "recipe_editors_can_update"
  on public.recipes
  for update
  to authenticated
  using ((select private.has_recipe_access('editor')))
  with check ((select private.has_recipe_access('editor')));

create policy "recipe_editors_can_delete"
  on public.recipes
  for delete
  to authenticated
  using ((select private.has_recipe_access('editor')));

commit;
