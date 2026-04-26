-- Run in Supabase SQL Editor. Fixes "new row violates row-level security policy" when creating a role.
drop policy if exists "Recruiters manage own roles" on public.recruiter_roles;
drop policy if exists "Allow insert own role" on public.recruiter_roles;

create policy "Recruiters manage own roles"
  on public.recruiter_roles for all
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);

-- Explicit insert policy so new users can create roles
create policy "Allow insert own role"
  on public.recruiter_roles for insert
  with check (auth.uid() = recruiter_id);
