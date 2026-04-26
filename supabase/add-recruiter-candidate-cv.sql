-- Run this once if recruiter_candidates already exists without candidate_cv
alter table public.recruiter_candidates add column if not exists candidate_cv text;
