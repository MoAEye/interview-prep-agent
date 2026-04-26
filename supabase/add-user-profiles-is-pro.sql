-- Run once in Supabase SQL Editor (same project as VITE_SUPABASE_URL).
alter table public.user_profiles
  add column if not exists is_pro boolean not null default false;

comment on column public.user_profiles.is_pro is 'When true, candidate sees Pro badge; use for gating premium features.';
