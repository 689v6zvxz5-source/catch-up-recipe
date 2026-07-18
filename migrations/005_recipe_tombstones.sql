-- Run after 003_lockdown_recipes.sql.
-- Deletions are retained as tombstones so an old offline edit cannot recreate a recipe.

begin;

alter table public.recipes
  add column if not exists deleted_at timestamptz;

create or replace function public.current_recipe_access()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select rm.role
  from public.recipe_members rm
  where rm.user_id = auth.uid()
    and rm.active = true
  limit 1;
$$;

revoke all on function public.current_recipe_access() from public, anon;
grant execute on function public.current_recipe_access() to authenticated;

create or replace function public.apply_recipe_change(
  p_id text,
  p_data jsonb,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.recipes (id, data, updated_at, deleted_at)
  values (p_id, coalesce(p_data, '{}'::jsonb), p_updated_at, p_deleted_at)
  on conflict (id) do update
  set data = excluded.data,
      updated_at = greatest(public.recipes.updated_at, excluded.updated_at),
      deleted_at = case
        when public.recipes.deleted_at is not null then public.recipes.deleted_at
        when excluded.deleted_at is not null then excluded.deleted_at
        else null
      end
  where public.recipes.deleted_at is null
    and (excluded.deleted_at is not null or excluded.updated_at > public.recipes.updated_at);

  return found;
end;
$$;

revoke all on function public.apply_recipe_change(text, jsonb, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.apply_recipe_change(text, jsonb, timestamptz, timestamptz)
  to authenticated;

commit;
