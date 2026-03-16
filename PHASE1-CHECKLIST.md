# Phase 1 — Save CV profile + pull into UploadForm

## What’s in place

- **Profile page:** Save CV once (resume_text, target_job_role, target_location) in `user_profiles`.
- **UploadForm:** “Use my saved profile” pre-fills CV and job title; submit still requires job description (paste or future: from saved job).
- **Defensive parsing:** `App.jsx` (handleRetryWeak), `Profile.jsx` (jobs/in_demand_roles), `InterviewHistory.jsx` (sessions) use safe arrays so UI doesn’t crash on bad data.
- **APIs:** `generate-questions` unchanged (accepts `resume_text`, `job_description`, `job_title`); response shape stable. `grade-interview` unchanged.

## SQL

- **None for Phase 1.** Table `user_profiles` already exists from earlier setup. If you haven’t run it, use `supabase/schema.sql` (the full file) in Supabase SQL Editor.

## Commands

```bash
cd /Users/mohammed/Desktop/interview-prep-agent-clean
git status
npm run start
```

## Smoke test

1. Open app → Sign in → Upload form.
2. Go to Profile → enter CV, job role, location → Save profile → Back.
3. On Upload form click “Use my saved profile” → CV and job title pre-fill.
4. Paste a job description → Generate Interview Questions → complete flow to report.
5. History and Dashboard still load; no console errors or blank screens.

## Rollback

- Revert code: `git checkout main` (or your previous branch).
- No DB rollback; `user_profiles` is safe to keep.

## Next

Phase 2: Run `supabase/migrations/001_job_tracker_and_docs.sql` (Phase 2 block only: `job_preferences` + `jobs` + RLS), then implement Job Tracker + dropdown + one-click reuse.
