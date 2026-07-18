# Recipe App member onboarding

Production app: `https://689v6zvxz5-source.github.io/catch-up-recipe/`

Approved editors:

- Son — `kanureel@hotmail.com`
- Ya — `rosarione.ya@gmail.com`

## Before changing RLS

1. In Supabase Authentication → URL Configuration, set the Site URL to the
   production app and add the same URL (including the trailing slash) to the
   Redirect URLs.
2. In Authentication → Users, send an invitation to each approved email.
3. Each person must open the invitation in their own browser and complete sign-in.
4. Confirm that both exact emails appear in Authentication → Users with a recent
   “Last sign in” time.
5. Run `migrations/001_recipe_membership.sql`.
6. Run a copy of `migrations/002_add_member.template.sql` once for each email with
   role `editor`.
7. Make a fresh export of all 57 rows and record its SHA-256 hash.
8. Only then run the lockdown and tombstone migrations described in `SECURITY.md`.

Do not add access by display name or email stored in user metadata. Membership
must reference the immutable `auth.users.id` resolved from the verified email.

## Required human check

Both Son and Ya must confirm all of the following before production deployment:

- The magic-link email arrives.
- The link opens the Recipe App.
- Existing recipes are visible.
- A test recipe can be created, edited, and deleted.
- Signing out returns to the login screen.

If either account fails, stop. Do not deploy and do not weaken RLS.
