# Managing your data in Supabase (Interview Prep Agent)

This guide is for **you** (the project owner) using the Supabase **dashboard** — not your end users.

## Where everything lives

| Area | Left sidebar | Use it for |
|------|----------------|------------|
| **Tables** | **Table Editor** | Browse rows, quick filters, insert/edit/delete (respects RLS when using “authenticated” preview in some flows; as owner you often have full access via dashboard). |
| **Ad-hoc data** | **SQL Editor** | Saved queries, exports, joins across tables, reading `auth.users`. |
| **Logins** | **Authentication → Users** | Emails, user IDs, sign-in providers, ban user, send password reset. |
| **API keys** | **Project Settings → API** | `anon` / `service_role` — never expose `service_role` in the browser. |
| **Redirects** | **Authentication → URL configuration** | Site URL + redirect URLs for production and `http://localhost:5173`. |
| **Logs & issues** | **Logs** / **Reports** | API errors, slow queries (depends on plan). |

## Tables in this app (mental model)

| Table | Purpose |
|-------|---------|
| `user_profiles` | One row per user: saved CV text, targets, **`is_pro`**, **`is_recruiter`**. |
| `interview_sessions` | Completed mocks: score, stars, `job_title`, **`answers` (JSON)**, optional `job_id`. |
| `resumes` / `job_descriptions` | Legacy upload rows (if you still use them). |
| `job_preferences` | Preferred roles/locations/salary for the job tracker. |
| `jobs` | Pipeline rows: company, title, status (`saved` → `offered`). |
| `documents` | Cover letters/notes tied to a job. |
| `recruiter_roles` | Shared role links (`share_slug`). |
| `recruiter_candidates` | Submissions against a role. |

`auth.users` holds **identity** (email, id). Your app links everything with `user_id uuid` → `auth.users.id`.

## Make the UI easier day to day

1. **SQL Editor → save queries**  
   Save snippets you run often (counts, latest sessions, Pro users). Name them clearly, e.g. `Daily — interview count this month`.

2. **Table Editor**  
   - Use **Sort** on `created_at` descending for “what happened recently”.  
   - Use **Filter** for `user_id` when supporting a specific customer.  
   - **Export to CSV** from the table menu when you need a spreadsheet.

3. **Comments in the database**  
   Run **`supabase/table-comments.sql`** once in the SQL Editor. Descriptions show on tables/columns in Studio and help future you remember what each field means.

4. **Admin-only SQL (no new public tables)**  
   Use **`supabase/snippets/admin-queries.sql`** as **copy-paste** in the SQL Editor only. Do **not** expose those queries through the app; they are for maintainers.

## RLS reminder

Row Level Security means the **anon key** in the browser only sees **that user’s** rows. In the dashboard, when you run SQL as the **postgres** role (default in SQL Editor), you bypass RLS — so you can inspect everything. That’s expected for admins; keep the **service role** key secret.

## Optional: test “what the app sees”

Use **Authentication → Users → … → Copy user UUID**, then in your app sign in as that user, or temporarily add a policy in a **branch/staging** project only. For quick checks, comparing dashboard (full) vs app (RLS) is enough.

## Files in this repo

| File | Action |
|------|--------|
| `supabase/table-comments.sql` | Run **once** per project (safe, metadata only). |
| `supabase/snippets/admin-queries.sql` | Copy queries when needed; do not run as part of app deploy. |
| `supabase/schema.sql` + migrations | Source of truth for schema; run in order on new projects. |
