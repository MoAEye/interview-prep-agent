-- Run in Supabase SQL Editor. Lets the candidate page load the role without calling the API (works with npm run dev).
-- Requires recruiter_roles table to exist (from PHASE5-SQL).

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
