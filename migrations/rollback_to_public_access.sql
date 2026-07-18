-- DANGER: this restores the original anonymous read/write/delete vulnerability.
-- Run only after explicit approval and only as a temporary emergency rollback.

begin;

drop policy if exists "recipe_members_can_read" on public.recipes;
drop policy if exists "recipe_editors_can_insert" on public.recipes;
drop policy if exists "recipe_editors_can_update" on public.recipes;
drop policy if exists "recipe_editors_can_delete" on public.recipes;

grant select, insert, update, delete on table public.recipes to anon, authenticated;

drop policy if exists "catchup_all" on public.recipes;
create policy "catchup_all"
  on public.recipes
  for all
  to anon, authenticated
  using (true)
  with check (true);

commit;
