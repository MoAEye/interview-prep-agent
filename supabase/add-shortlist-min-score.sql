-- Run once in Supabase SQL Editor to add per-role shortlist threshold (minimum score to "meet shortlist")
alter table public.recruiter_roles add column if not exists shortlist_min_score int;

comment on column public.recruiter_roles.shortlist_min_score is 'Minimum score (0-100) to count as shortlisted; null = no threshold';
