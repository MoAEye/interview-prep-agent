# InterviewAI — copy this to Claude for architecture / upgrades

Use the block below as your prompt when asking Claude for help with this codebase.

---

## Project: InterviewAI (Interview Prep Agent)

**What it is:** A web app for UK job seekers to practice interviews with an AI coach (“Aria”). Recruiters can create shareable role links so candidates complete a **quick interview** (short questionnaire); candidates can also use the **full candidate portal** for CV + job-description–tailored mock interviews, grading, and history.

**Stack:**
- **Frontend:** React (Vite), single-page app, heavy inline styles (pastel / modern theme).
- **Backend:** Vercel serverless functions under `api/*.js` (Node). Local dev: `npm run start` → Vercel dev on **port 3000** (frontend + API together).
- **Auth & DB:** Supabase (PostgreSQL + Auth + RLS). Client uses anon key; some APIs use **service role** for recruiter candidate writes / role-by-slug reads.
- **AI:** OpenAI (`gpt-4o-mini` etc.) for generating interview questions and grading answers.

**Main user flows:**
1. **Candidate (signed in):** Landing → Login/Signup → (after signup) **Create profile** (CV, target role, UK location) → **Upload / prep** screen: paste CV + job description → `POST /api/generate-questions` → Questions list → **MockInterview** (timed, optional voice) → **InterviewReport** (scores, feedback) → Practice again / history / dashboard.
2. **Recruiter (signed in, `user_profiles.is_recruiter`):** **RecruiterDashboard** — create roles (title + description), share slug URL `/r/{slug}`, view shortlists, statuses, shortlist threshold, duplicate/delete roles, share link / email templates, export ideas.
3. **Public recruiter link (`/r/{slug}`):** **RecruiterCandidateFlow** — no auth required; collects name, email, CV; generates questions for that role; submits to `POST /api/recruiter/submit-interview` (same grading philosophy as main `grade-interview`). After submit, **Create account** stores prefill in `sessionStorage` and redirects to `/?signup=1` → signup with confirm password → profile saved from recruiter data (`user_profiles` + `job_descriptions` + optional `resumes` row) → onboarding **Profile** step → main prep screen. API `GET /api/candidate/my-recruiter-submissions` (Bearer JWT) returns applications matching the user’s email for “Practice from recruiter applications” on the prep screen.

**Important files:**
- `src/App.jsx` — routing by `screen` state + special case `pathname` `/r/:slug` for public flow.
- `src/UploadForm.jsx`, `MockInterview.jsx`, `InterviewReport.jsx`, `Profile.jsx`, `Login.jsx`, `RecruiterDashboard.jsx`, `RecruiterCandidateFlow.jsx`.
- `api/generate-questions.js`, `api/grade-interview.js`, `api/recruiter/submit-interview.js`, `api/recruiter/role-by-slug.js`, `api/candidate/my-recruiter-submissions.js`.
- `supabase/PASTE-THIS-ONCE.sql` — idempotent schema (user_profiles, recruiter_roles, recruiter_candidates, RLS, `get_role_by_slug` RPC).
- `src/signupPrefill.js` — session keys for recruiter → candidate signup prefill.

**Conventions / pitfalls:**
- Use **same origin** for dev (e.g. `localhost:3000` with `npm run start`) so Supabase session and API calls stay consistent.
- RLS: recruiters see only their roles/candidates; candidates use JWT + service role only inside controlled API routes where needed.
- Env: `.env.local` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

**Feature ideas already discussed or partial:** CSV export of shortlist, deeper notification system, stricter scoring for minimal answers in recruiter submit.

---

When asking Claude, add your specific question (e.g. “How should we add X?” or “Review this migration”) after pasting the above.
