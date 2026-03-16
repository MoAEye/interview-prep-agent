-- Run in Supabase SQL Editor. Run Phase 2 block when starting Phase 2, etc.
-- Existing tables (resumes, job_descriptions, user_profiles, interview_sessions) are unchanged here.

-- ========== PHASE 2: Job preferences + Job tracker ==========
create table if not exists public.job_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_roles text[] default '{}',
  preferred_locations text[] default '{}',
  salary_min int,
  salary_max int,
  keywords text default '',
  updated_at timestamptz default now()
);

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

alter table public.job_preferences enable row level security;
alter table public.jobs enable row level security;

create policy "Users can manage own job_preferences"
  on public.job_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own jobs"
  on public.jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== PHASE 3: Documents ==========
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

alter table public.documents enable row level security;

create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== PHASE 4: Link interview_sessions to jobs ==========
alter table public.interview_sessions
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

create index if not exists idx_interview_sessions_job_id on public.interview_sessions(job_id);

-- ========== FUTURE: Recruiter (do not run until Phase 5) ==========
-- create table if not exists public.recruiter_roles (
--   id uuid primary key default gen_random_uuid(),
--   recruiter_id uuid not null references auth.users(id) on delete cascade,
--   title text not null,
--   description text default '',
--   share_link_slug text unique,
--   created_at timestamptz default now()
-- );
-- create table if not exists public.recruiter_candidates (
--   id uuid primary key default gen_random_uuid(),
--   role_id uuid not null references public.recruiter_roles(id) on delete cascade,
--   candidate_email text,
--   interview_session_id uuid references public.interview_sessions(id),
--   score int,
--   created_at timestamptz default now()
-- );
