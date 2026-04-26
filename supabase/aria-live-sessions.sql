-- Run once in Supabase SQL Editor: stores ended Aria Live sessions for the dashboard.
create table if not exists public.aria_live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_seconds int not null default 0,
  focus_id text,
  session_mode text,
  topics jsonb default '[]'::jsonb,
  message_count int not null default 0,
  summary text,
  transcript jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_aria_live_sessions_user_created
  on public.aria_live_sessions (user_id, created_at desc);

alter table public.aria_live_sessions enable row level security;

create policy "Users manage own aria_live_sessions"
  on public.aria_live_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
