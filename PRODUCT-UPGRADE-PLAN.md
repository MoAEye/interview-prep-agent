# Interview Prep Agent — Product Upgrade Plan

**Role:** Senior full-stack engineer + product architect  
**Context:** Non-technical builder; existing app: React + Vite, Vercel serverless, OpenAI, Supabase Auth/DB.  
**Goal:** Implement upgrades incrementally without breaking the current flow.

---

## A) Architecture (simple)

- **Profile (user_profiles):** One row per user. Stores CV text + target role/location. Source of truth for “paste CV once”; updated from Profile page or when user submits the upload form.
- **Job preferences (job_preferences):** One row per user. Preferred roles, locations, salary range, keywords. Used to tailor prep packs and suggestions.
- **Jobs (jobs):** Job tracker. Many rows per user. Each row = one saved job (company, title, link, job_description, status). Linked to documents and interview_sessions via `job_id`.
- **Documents (documents):** Generated cover letters/notes. Many per user; each row can link to a `job_id`. Stored text + type (cover_letter | cover_note).
- **Interview sessions (interview_sessions):** Existing. Add optional `job_id` to link a session to a saved job. Enables “attempts per job” and performance history.

**Flow:** User saves CV in Profile → adds/saves jobs in Job Tracker → on Upload form picks a saved job (or pastes new JD) → generates prep pack → runs mock interview → report is linked to that job. Cover letter/note generator uses profile CV + selected job. Documents library lists docs by job.

---

## B) Database Plan (Supabase)

### 1. SQL for tables

**profiles** — We already have `user_profiles` (resume_text, target_job_role, target_location). Keep it; treat as “profiles” in the plan.

**job_preferences** — New table (one row per user):

```sql
create table if not exists public.job_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_roles text[] default '{}',
  preferred_locations text[] default '{}',
  salary_min int,
  salary_max int,
  keywords text default '',
  updated_at timestamptz default now()
);
```

**jobs** — Job tracker (many per user):

```sql
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text default '',
  title text not null default '',
  job_url text default '',
  job_description text default '',
  status text not null default 'saved' check (status in ('saved','applied','interview','rejected','offered')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_jobs_user_id on public.jobs(user_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_updated_at on public.jobs(updated_at desc);
```

**documents** — Generated docs linked to job (optional):

```sql
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  doc_type text not null check (doc_type in ('cover_letter','cover_note')),
  content text not null default '',
  created_at timestamptz default now()
);
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_job_id on public.documents(job_id);
```

**interview_sessions** — Add `job_id` (optional, no breaking change):

```sql
alter table public.interview_sessions
  add column if not exists job_id uuid references public.jobs(id) on delete set null;
create index if not exists idx_interview_sessions_job_id on public.interview_sessions(job_id);
```

**recruiter_roles (future):**

```sql
-- create table if not exists public.recruiter_roles (
--   id uuid primary key default gen_random_uuid(),
--   recruiter_id uuid not null references auth.users(id) on delete cascade,
--   title text not null,
--   description text default '',
--   share_link_slug text unique,
--   created_at timestamptz default now()
-- );
```

**recruiter_candidates (future):**

```sql
-- create table if not exists public.recruiter_candidates (
--   id uuid primary key default gen_random_uuid(),
--   role_id uuid not null references public.recruiter_roles(id) on delete cascade,
--   candidate_email text,
--   interview_session_id uuid references public.interview_sessions(id),
--   score int,
--   created_at timestamptz default now()
-- );
```

### 2. RLS policies (users can only access own data)

- **user_profiles:** Already have "Users can manage own user_profiles".
- **job_preferences:** `using (auth.uid() = user_id)` and `with check (auth.uid() = user_id)`.
- **jobs:** Same.
- **documents:** Same.
- **interview_sessions:** Existing; no change needed for RLS when adding `job_id`.

### 3. Required indexes

- Listed above per table (user_id, job_id, status, updated_at where needed).

---

## C) API Routes Plan (Vercel)

| Route | Method | Request body/query | Response shape |
|-------|--------|-------------------|----------------|
| `/api/generate-questions` | POST | `resume_text`, `job_description`, `job_title` (keep). Optional: `profile_id` / use profile CV if provided. | `{ candidate_summary, job_summary, top_resume_signals[], top_job_priorities[], likely_weaknesses[], questions[] }` — keep stable. |
| `/api/grade-interview` | POST | (existing) | `{ overall_score, star_rating, summary, strengths[], improvements[], question_grades[] }` — keep stable. |
| `/api/generate-cover-letter` | POST | `{ cv_text, job_title, company, job_description }` | `{ cover_letter: string }` |
| `/api/generate-cover-note` | POST | Same | `{ cover_note: string }` (short, LinkedIn/email) |
| (future) `/api/recruiter/create-role` | POST | role details | share link, etc. |
| (future) `/api/recruiter/get-shortlist` | GET | role_id | ranked candidates + scorecards |

---

## D) Frontend Plan (React)

- **Profile page:** Already exists. Save/update CV once; add optional “Preferences” block (roles, locations, salary range, keywords) writing to `job_preferences`.
- **Preferences section:** New subsection on Profile or separate small screen: preferred roles, locations, salary min/max, keywords. Save to `job_preferences`.
- **Job tracker page:** New. List saved jobs (company, title, status); add/edit job; status dropdown; link to job URL.
- **Job dropdown “recent jobs”:** On Upload form. Dropdown of user’s jobs (e.g. last 20); on select, pre-fill job title + job description (and optionally company). “Generate pack” uses that job.
- **Documents library page:** List documents (by job, type, date); download; filter by job.
- **Job detail page:** For one job: generate cover letter / cover note buttons; list documents for this job; list interview attempts (sessions with this job_id) + scores.
- **UploadForm:** Already pulls from profile (“Use my saved profile”). Extend to: (1) load recent jobs into dropdown; (2) on “Generate pack”, optionally create/update a `jobs` row and pass `job_id` to session when starting interview; (3) accept pre-filled job from dropdown.

---

## E) Step-by-step Build Roadmap

**Phase 1: Save CV Profile + pull into UploadForm**  
- Already done: Profile saves CV; UploadForm has “Use my saved profile”.  
- Checkpoint: No schema change required for Phase 1; ensure demo mode and existing flow work. Add defensive parsing so UI never crashes on bad API data.

**Phase 2: Job tracker + one-click reuse**  
- SQL: Add `jobs` table + RLS.  
- API: No new route; CRUD via Supabase client from frontend.  
- UI: Job tracker page (list, add, edit, status); Upload form: “Recent jobs” dropdown; on select pre-fill title + description; optional “Save as new job” on submit.  
- Checkpoint: Can save a job, select it, generate pack without breaking existing flow.

**Phase 3: Documents generator + library**  
- SQL: Add `documents` table + RLS.  
- API: Add `/api/generate-cover-letter`, `/api/generate-cover-note`.  
- UI: On job detail (or from tracker): “Generate cover letter” / “Generate cover note”; save to `documents`; Documents library page.  
- Checkpoint: Generate and save cover letter/note; view in library.

**Phase 4: Link sessions to jobs + performance history**  
- SQL: Add `interview_sessions.job_id`; optional `job_id` when saving session.  
- UI: When starting interview from Upload form with a selected job, pass `job_id`; save it when grading. Job detail page: “Interview attempts” with scores over time.  
- Checkpoint: Sessions linked to jobs; history per job visible.

**Phase 5: Recruiter mode MVP (future)**  
- After Phase 4. Outline only: tables, RLS, screens, shortlist logic, pricing idea. Do not implement yet.

---

## F) Implementation Instructions (copy/paste ready)

### Phase 1 (current checkpoint) — DONE

**1. Terminal (copy/paste)**

```bash
cd /Users/mohammed/Desktop/interview-prep-agent-clean
git checkout -b phase1-profile-checkpoint
npm run start
```

**2. Smoke tests**

- [ ] Landing → Login → Upload form loads.  
- [ ] Profile: Save CV + role + location → Back → “Use my saved profile” pre-fills CV and job title.  
- [ ] Generate pack with all fields filled → questions screen → mock interview → report (no crash).  
- [ ] Demo mode (if applicable): Use without sign-in; no profile save; no crash.  
- [ ] No `.map()` runtime errors: all lists guarded (e.g. `(arr || []).map`). See ROLLBACK.md for demo-safe checklist.

**3. Rollback**

- If something breaks: `git checkout main` (or previous branch). No DB rollback needed for Phase 1 (user_profiles already exists). See ROLLBACK.md.

### Phase 2 (after Phase 1)

**1. SQL (run in Supabase SQL Editor)**

- Run the `jobs` table + indexes + RLS from section B.  
- (And `job_preferences` if adding preferences in Phase 2.)

**2. Branch**

```bash
git checkout -b phase2-job-tracker
```

**3. Files to add/change**

- New: `src/JobTracker.jsx` (list jobs, add, edit, status).  
- New: `src/JobSelect.jsx` or inline in UploadForm: dropdown of jobs, on select set job title + description.  
- Modify: `UploadForm.jsx` — fetch jobs, dropdown, pre-fill from selected job; optional “Save current as job” on submit.  
- Modify: `App.jsx` — add route/screen for Job Tracker, nav link.

**4. Smoke tests**

- [ ] Add a job in tracker; open Upload; select job from dropdown; fields pre-fill; generate pack works.  
- [ ] Existing flow (no job selected, paste manually) still works.

---

## G) Minimal UI / UX rules

- Sensible defaults: e.g. status “saved”, empty arrays for preferences.  
- Prefill CV automatically when profile exists (already: “Use my saved profile” one click).  
- Recent jobs dropdown: show last 10–20 by updated_at; “— New job (paste below) —” option.  
- Single clear “Generate pack” button; keep existing flow.  
- No complicated navigation: Profile, Job Tracker, Documents, History in nav or from Upload form.

---

## H) Future Recruiter Mode (outline only)

- **DB:** `recruiter_roles` (recruiter_id, title, description, share_link_slug); `recruiter_candidates` (role_id, candidate_email, interview_session_id, score). RLS: recruiters see own roles/candidates; candidates see only the session they’re invited to (by link).  
- **Screens:** Recruiter: create role → get link; candidate: open link → quick interview → submit; recruiter: shortlist view with scorecards, ranked.  
- **Scoring:** Reuse existing grade-interview API; store score on recruiter_candidates.  
- **Pricing idea:** Per role or per candidate slot; or monthly cap on roles/shortlists.  
- Do not implement until after Phase 4.

---

## Demo-safe checklist (after each phase)

- [ ] Logged-out or demo user cannot write to profile/jobs/documents.  
- [ ] All array/object access in UI uses safe defaults (e.g. `(data?.questions || []).map`).  
- [ ] API responses: preserve existing shapes; new fields optional.  
- [ ] Rollback plan documented (git branch + optional SQL revert).
