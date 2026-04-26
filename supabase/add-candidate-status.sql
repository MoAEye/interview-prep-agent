-- Run once in Supabase SQL Editor to add candidate status (Reviewing, Contact, Interview scheduled, Rejected, Hired)
alter table public.recruiter_candidates
  add column if not exists status text not null default 'reviewing';

comment on column public.recruiter_candidates.status is 'One of: reviewing, contact, interview_scheduled, rejected, hired';
