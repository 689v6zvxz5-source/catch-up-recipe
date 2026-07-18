-- Run only after the person has signed in once and appears in auth.users.
-- Replace both placeholders before running. Allowed roles: viewer, editor.

do $$
declare
  target_email text := 'REPLACE_WITH_VERIFIED_EMAIL';
  target_role text := 'REPLACE_WITH_viewer_OR_editor';
  target_user_id uuid;
begin
  if target_role not in ('viewer', 'editor') then
    raise exception 'Role must be viewer or editor';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  order by created_at asc
  limit 1;

  if target_user_id is null then
    raise exception 'No auth.users row found for %; ask the person to sign in once first', target_email;
  end if;

  insert into public.recipe_members (user_id, role, active)
  values (target_user_id, target_role, true)
  on conflict (user_id) do update
    set role = excluded.role,
        active = true,
        updated_at = now();
end
$$;
