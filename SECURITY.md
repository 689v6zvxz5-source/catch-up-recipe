# Recipe App security runbook

The publishable/anon key is expected to be visible in browser code. It is safe only when Supabase Auth and RLS deny access to users who are not active members.

Never use a service-role key in this app.

## Production rollout order

1. Export `public.recipes` and record the file hash.
2. Run `migrations/001_recipe_membership.sql`.
3. Enable the chosen Supabase Auth email flow and add both production app origins to the redirect allow list.
4. Let each intended member sign in once so a row exists in `auth.users`.
5. For each member, copy `migrations/002_add_member.template.sql`, replace the email and role, and run it in SQL Editor.
6. Confirm at least one active `editor` exists.
7. Run `migrations/003_lockdown_recipes.sql`.
8. Run `migrations/004_security_verification.sql`.
9. Test with an authorized editor, an authorized viewer, an authenticated non-member, and no session.
10. Deploy clients only after every test passes.

## Add a member

The person signs in once, then an administrator runs the template in `002_add_member.template.sql` with that person's verified email. Use:

- `viewer` for read-only access.
- `editor` for create, update, and delete access.

Membership is tied to `auth.users.id`, not a user-editable metadata field.

## Remove a member

Run this in SQL Editor with the real verified email:

```sql
update public.recipe_members as member
set active = false, updated_at = now()
from auth.users as account
where member.user_id = account.id
  and lower(account.email) = lower('person@example.com');
```

The next API request will be denied by RLS. Signing the person out of known devices is also recommended.

## Required access tests

| Session | Read | Insert | Update | Delete |
|---|---:|---:|---:|---:|
| Active editor | Allow | Allow | Allow | Allow |
| Active viewer | Allow | Deny | Deny | Deny |
| Authenticated non-member | Deny | Deny | Deny | Deny |
| No session / anon | Deny | Deny | Deny | Deny |

Also verify that the browser bundle contains no service-role key.

## Rollback

`migrations/rollback_to_public_access.sql` restores the old public policy and therefore restores the original vulnerability. Use it only as an explicitly approved emergency action. Prefer pausing deployment and fixing membership instead.

The membership table is intentionally retained by rollback so a corrected lockdown can be re-applied without recreating members.
