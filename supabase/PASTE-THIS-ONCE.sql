-- ============================================================
-- PASTE THIS ONCE in Supabase → SQL Editor → Run
-- Use the SAME project as in your .env.local (VITE_SUPABASE_URL)
-- ============================================================

-- Base tables (if missing)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resume_text text default '',
  target_job_role text default '',
  target_location text default '',
  updated_at timestamptz default now()
);
create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);
alter table public.user_profiles enable row level security;
drop policy if exists "Users can manage own user_profiles" on public.user_profiles;
create policy "Users can manage own user_profiles"
  on public.user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.user_profiles
  add column if not exists is_recruiter boolean not null default false;

-- Recruiter roles
create table if not exists public.recruiter_roles (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  share_slug text not null,
  shortlist_min_score int,
  created_at timestamptz default now()
);
create index if not exists idx_recruiter_roles_recruiter_id on public.recruiter_roles(recruiter_id);
create unique index if not exists idx_recruiter_roles_share_slug on public.recruiter_roles(share_slug);
alter table public.recruiter_roles add column if not exists shortlist_min_score int;

create table if not exists public.recruiter_candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.recruiter_roles(id) on delete cascade,
  candidate_email text,
  candidate_name text,
  candidate_cv text,
  answers jsonb default '[]',
  score int,
  status text not null default 'reviewing',
  created_at timestamptz default now()
);
create index if not exists idx_recruiter_candidates_role_id on public.recruiter_candidates(role_id);
alter table public.recruiter_candidates add column if not exists candidate_cv text;
alter table public.recruiter_candidates add column if not exists status text default 'reviewing';

alter table public.recruiter_roles enable row level security;
alter table public.recruiter_candidates enable row level security;

drop policy if exists "Recruiters manage own roles" on public.recruiter_roles;
drop policy if exists "Allow insert own role" on public.recruiter_roles;
create policy "Recruiters manage own roles"
  on public.recruiter_roles for all
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);
create policy "Allow insert own role"
  on public.recruiter_roles for insert
  with check (auth.uid() = recruiter_id);

drop policy if exists "Recruiters manage own candidates" on public.recruiter_candidates;
create policy "Recruiters manage own candidates"
  on public.recruiter_candidates for all
  using (exists (
    select 1 from public.recruiter_roles r
    where r.id = recruiter_candidates.role_id and r.recruiter_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.recruiter_roles r
    where r.id = recruiter_candidates.role_id and r.recruiter_id = auth.uid()
  ));

create or replace function public.get_role_by_slug(slug text)
returns table (id uuid, title text, description text)
language sql
security definer
set search_path = public
as $$
  select r.id, r.title, r.description
  from recruiter_roles r
  where r.share_slug = slug;
$$;
grant execute on function public.get_role_by_slug(text) to anon;
grant execute on function public.get_role_by_slug(text) to authenticated;
