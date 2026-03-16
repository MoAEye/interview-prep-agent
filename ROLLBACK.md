# Rollback & safety

## After any phase

- **Code:** `git checkout main` (or your previous branch) to revert file changes.
- **DB:** New tables (`jobs`, `job_preferences`, `documents`) can be left in place; they are additive. If you must remove them, run (only if you are sure):
  - Phase 4: `alter table public.interview_sessions drop column if exists job_id;`
  - Phase 3: `drop table if exists public.documents;`
  - Phase 2: `drop table if exists public.jobs;` and `drop table if exists public.job_preferences;`
- **RLS:** Dropping a table removes its policies. Re-running the original schema re-creates tables; run the migration again to re-add RLS after a fresh create.

## Demo-safe checklist (after each phase)

- [ ] Logged-out or demo user cannot write to profile / jobs / documents.
- [ ] All array/object access in UI uses safe defaults (e.g. `(data?.questions || []).map`).
- [ ] API responses: existing payload shapes unchanged; new fields optional.
- [ ] Rollback steps above documented and tested (e.g. branch revert, then `npm run start`).
