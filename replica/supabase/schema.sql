-- Run this in your new Supabase project: SQL Editor → New query → paste and run.
-- Creates tables and RLS so the app works the same as before.

-- Resumes (one row per upload)
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_text text not null,
  created_at timestamptz default now()
);

-- Job descriptions (one row per upload)
create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null,
  job_description text not null,
  created_at timestamptz default now()
);

-- Interview sessions (saved after grading)
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int default 0,
  stars int default 0,
  job_title text,
  answers jsonb default '[]',
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_job_descriptions_user_id on public.job_descriptions(user_id);
create index if not exists idx_interview_sessions_user_id on public.interview_sessions(user_id);
create index if not exists idx_interview_sessions_created_at on public.interview_sessions(created_at);

-- RLS: users can only access their own rows
alter table public.resumes enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.interview_sessions enable row level security;

create policy "Users can manage own resumes"
  on public.resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own job_descriptions"
  on public.job_descriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own interview_sessions"
  on public.interview_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
