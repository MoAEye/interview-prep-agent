-- Copy everything below this line and paste into Supabase → SQL Editor → Run.
-- This fixes "Role not found" by creating recruiter tables and the get_role_by_slug function.
-- Use the SAME Supabase project as in your .env.local (VITE_SUPABASE_URL).
-- If you get "relation user_profiles does not exist", run supabase/schema.sql first.

-- 1) Recruiter flag on user profiles (needed for "I'm a recruiter" flow)
alter table public.user_profiles
  add column if not exists is_recruiter boolean not null default false;

-- 2) Recruiter roles (one row per role; share_slug is used in the candidate link)
create table if not exists public.recruiter_roles (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  share_slug text not null,
  created_at timestamptz default now()
);
create index if not exists idx_recruiter_roles_recruiter_id on public.recruiter_roles(recruiter_id);
create unique index if not exists idx_recruiter_roles_share_slug on public.recruiter_roles(share_slug);

-- 3) Candidates who applied via the share link
create table if not exists public.recruiter_candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.recruiter_roles(id) on delete cascade,
  candidate_email text,
  candidate_name text,
  answers jsonb default '[]',
  score int,
  created_at timestamptz default now()
);
create index if not exists idx_recruiter_candidates_role_id on public.recruiter_candidates(role_id);

-- 4) RLS: recruiters only see their own roles and candidates
alter table public.recruiter_roles enable row level security;
alter table public.recruiter_candidates enable row level security;

drop policy if exists "Recruiters manage own roles" on public.recruiter_roles;
create policy "Recruiters manage own roles"
  on public.recruiter_roles for all
  using (auth.uid() = recruiter_id)
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

-- 5) Function so the candidate page can load the role by slug (no auth required)
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
