-- Run in Supabase SQL Editor if inserts/upserts to user_profiles fail with RLS errors
-- (policies must include WITH CHECK for INSERT/UPSERT)

alter table public.user_profiles enable row level security;

drop policy if exists "Users can manage own user_profiles" on public.user_profiles;

create policy "Users can manage own user_profiles"
  on public.user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
