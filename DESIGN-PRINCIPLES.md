# Recipe App Design Principles

1. The Recipe App is the only place that creates, edits, deletes, shares, or scales recipes.
2. Supabase is the single source of truth for recipes; local storage is an offline working cache.
3. Catch Up OS may read recipes but must never create a second recipe copy in Google Drive.
4. Authentication and Row Level Security protect data. A browser publishable key is never authorization by itself.
5. Never put a service-role key in browser code, build output, screenshots, logs, or documentation.
6. Offline changes must not be overwritten by older cloud data.
7. A deletion must not be silently resurrected by a stale device.
8. Stable recipe IDs are permanent internal links. Share links remain separate importable copies.
9. Technical status should stay out of the normal user journey unless action is required.
10. Use everyday Thai and preserve the existing calm, mobile-first reading experience.

## Change guardrails

- Back up all production recipes before changing sync, schema, or RLS.
- Test authorized and unauthorized access before production deployment.
- Apply membership before the lockdown migration.
- Keep `#r=` share links working when adding `#recipe=` deep links.
