-- Phase 3: Documents (cover letters / notes). Run in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  doc_type text not null check (doc_type in ('cover_letter','cover_note')),
  content text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_job_id on public.documents(job_id);

alter table public.documents enable row level security;

create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
