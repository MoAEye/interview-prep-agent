-- Phase 2: Job tracker. Run in Supabase → SQL Editor → New query → paste → Run.

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
