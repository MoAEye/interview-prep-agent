-- Phase 4: Link interview sessions to jobs. Run in Supabase → SQL Editor → New query → paste → Run.

alter table public.interview_sessions
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

create index if not exists idx_interview_sessions_job_id on public.interview_sessions(job_id);
