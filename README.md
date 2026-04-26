# Interview Prep Agent

AI-powered mock interview app: upload resume + job description → get tailored questions → do a mock interview → get graded and save history.

---

## Link to your new Supabase and GitHub

### 1. Supabase (new project)

1. Create a project at [supabase.com](https://supabase.com) → **New project**.
2. In the dashboard: **SQL Editor** → **New query** → paste the contents of **`supabase/schema.sql`** → **Run**.  
   This creates `resumes`, `job_descriptions`, and `interview_sessions` with RLS.
3. Enable Auth (if not already): **Authentication** → **Providers** → enable **Email** (and optionally confirm email or turn it off for testing).
4. Get your keys: **Settings** → **API**:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon public** key → use as `VITE_SUPABASE_ANON_KEY`

### 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

- `VITE_SUPABASE_URL` = your new Supabase project URL  
- `VITE_SUPABASE_ANON_KEY` = your new Supabase anon key  
- `OPENAI_API_KEY` = your OpenAI API key (for local server or Vercel serverless)

Do not commit `.env.local`. It’s already in `.gitignore`.

### 3. GitHub (new repo)

If this folder isn’t already a Git repo:

```bash
git init
git add .
git commit -m "Initial commit"
```

Point at your new GitHub repo and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If you already have a repo and want to switch to a new GitHub remote:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 4. Run locally

```bash
npm install
```

#### Default: same as before — Vercel dev (UI + `/api` on one URL)

**`npm run dev`** and **`npm run start`** are the same: they run **`vercel dev`** (via `run-with-env.js`, which loads `.env.local`). That’s what was working before.

1. **Remove a bad token from env:** open `.env.local` and delete any line `VERCEL_TOKEN=...` (expired tokens cause *“The specified token is not valid”*).  
   The runner ignores `VERCEL_TOKEN` for that session, but deleting it avoids confusion.
2. **Log in once:** `npx vercel login` (browser flow).
3. **Link the folder once** (if `vercel dev` asks): `npx vercel link` — pick your Vercel account and a project. Deploying is optional; linking is enough for local dev.
4. **Start:** `npm run dev` **or** `npm run start`  
5. Open the URL the CLI prints (often **`http://localhost:3000`**). Use that base for **recruiter** and **`/r/…` share links** so `/api` matches the same host.

Ensure `.env.local` has **`OPENAI_API_KEY`**, **`VITE_SUPABASE_*`**, and **`SUPABASE_SERVICE_ROLE_KEY`** where recruiter APIs need them.

#### Alternative: no Vercel login

```bash
npm run dev:local
```

Same as **`npm run dev:vite`**: one command starts **local API on :8787** + **Vite on :5173** (`concurrently`, with `DEV_API_PROXY_TARGET` set). Or two terminals: `npm run api:local` + `npm run dev:ui-only` (then set **`DEV_API_PROXY_TARGET=http://127.0.0.1:8787`** in `.env.local` so the proxy works).

#### Port 5173 without Vercel

**`npm run dev:vite`** — **UI + local `/api`** on **http://localhost:5173** (recommended for “no Vercel” full stack).

**`npm run dev:ui-only`** — Vite only (no `/api`). Use for quick UI tweaks; run **`npm run dev:vite`** for full flows (questions, grading).

**If the UI looks outdated:** `rm -rf dist`, restart, then hard-refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`).

### 5. Deploy (Vercel)

1. Push your code to GitHub (see step 3).
2. In [vercel.com](https://vercel.com): **Add New** → **Project** → import your GitHub repo.
3. **Environment Variables** (for the Vercel project):
   - `VITE_SUPABASE_URL` = your Supabase URL  
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key  
   - `OPENAI_API_KEY` = your OpenAI key  
4. Deploy. The `api/` folder is used as Vercel serverless functions (see `vercel.json`).

After this, the app uses your new Supabase for auth and data and your new GitHub repo for code; behavior stays the same.
