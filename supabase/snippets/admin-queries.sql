-- =============================================================================
-- MAINTAINER SNIPPETS — paste into Supabase → SQL Editor only.
-- Do NOT call these from the web app. Run as project owner (bypasses RLS).
-- =============================================================================

-- ----- User lookup: email → public user id -----
-- select id, email, created_at from auth.users where email ilike '%name%';

-- ----- Recent interview sessions (with email) -----
select
  s.id,
  s.created_at,
  s.job_title,
  s.score,
  s.stars,
  u.email
from public.interview_sessions s
left join auth.users u on u.id = s.user_id
order by s.created_at desc
limit 50;

-- ----- Pro users -----
select
  u.email,
  p.is_pro,
  p.is_recruiter,
  p.updated_at
from public.user_profiles p
join auth.users u on u.id = p.user_id
where p.is_pro = true
order by p.updated_at desc nulls last;

-- ----- Interview volume by UTC month -----
select
  date_trunc('month', created_at at time zone 'UTC') as month_utc,
  count(*) as sessions
from public.interview_sessions
group by 1
order by 1 desc;

-- ----- Job tracker: rows per status -----
select status, count(*) from public.jobs group by status order by count(*) desc;

-- ----- Recruiter: roles and candidate counts -----
select
  r.title,
  r.share_slug,
  count(c.id) as candidates
from public.recruiter_roles r
left join public.recruiter_candidates c on c.role_id = r.id
group by r.id, r.title, r.share_slug
order by candidates desc;

-- ----- Storage: table sizes (rough row counts) -----
select relname as table_name, n_live_tup as approx_rows
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc;
