-- Run once in Supabase → SQL Editor (project owner).
-- Adds descriptions visible in Table Editor / schema UI. Safe to re-run.

comment on table public.user_profiles is 'Candidate profile: saved CV, job targets, Pro flag, recruiter flag.';
comment on column public.user_profiles.user_id is 'Primary key; matches auth.users.id.';
comment on column public.user_profiles.resume_text is 'Latest CV text used by CV editor / tailor flows.';
comment on column public.user_profiles.target_job_role is 'User-stated target role for prep.';
comment on column public.user_profiles.target_location is 'User-stated location preference.';
comment on column public.user_profiles.is_pro is 'Server-trusted Pro entitlement; gates premium APIs.';
comment on column public.user_profiles.is_recruiter is 'When true, user can access recruiter dashboard.';

comment on table public.interview_sessions is 'Saved mock interviews after grading.';
comment on column public.interview_sessions.answers is 'JSON array: question, answer, scores, skipped, etc.';
comment on column public.interview_sessions.job_id is 'Optional link to public.jobs for job-tracker context.';
comment on column public.interview_sessions.score is 'Overall score (0–100) as stored by the app.';
comment on column public.interview_sessions.stars is 'Star rating shown in UI.';

comment on table public.resumes is 'Per-upload resume text (legacy / uploads flow).';
comment on table public.job_descriptions is 'Per-upload job description text (legacy / uploads flow).';

comment on table public.job_preferences is 'Job tracker preferences: roles, locations, salary band.';
comment on table public.jobs is 'Job tracker pipeline: one row per role application.';
comment on column public.jobs.status is 'Pipeline: saved | applied | interview | rejected | offered.';

comment on table public.documents is 'AI-generated cover letter / cover note content per user (optional job link).';
comment on column public.documents.doc_type is 'cover_letter or cover_note.';
comment on column public.documents.job_id is 'Optional FK to jobs.id.';

comment on table public.recruiter_roles is 'Recruiter-created role; share_slug used in public candidate URL.';
comment on column public.recruiter_roles.share_slug is 'Unique slug for /r/{slug} style links.';
comment on table public.recruiter_candidates is 'Candidate submission for a recruiter role.';
comment on column public.recruiter_candidates.answers is 'JSON interview answers from candidate flow.';
comment on column public.recruiter_candidates.status is 'Pipeline: reviewing, contact, interview_scheduled, rejected, hired.';
