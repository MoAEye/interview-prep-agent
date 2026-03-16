# Interview Prep Agent

**This folder is a clean, full copy of the app** — same code, no git history or secrets. Use it with your new Supabase and GitHub by following the steps below.

---

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
npm run dev
```

The frontend runs (e.g. `http://localhost:5173`). The app expects `/api/generate-questions` and `/api/grade-interview` to be available:

- **Option A – Vercel:** `npx vercel dev` so the `api/` serverless functions run locally with your env.
- **Option B – Custom server:** Run your own server that serves the Vite build and proxies to the same API logic, and set `OPENAI_API_KEY` in that server’s environment.

### 5. Deploy (Vercel)

1. Push your code to GitHub (see step 3).
2. In [vercel.com](https://vercel.com): **Add New** → **Project** → import your GitHub repo.
3. **Environment Variables** (for the Vercel project):
   - `VITE_SUPABASE_URL` = your Supabase URL  
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key  
   - `OPENAI_API_KEY` = your OpenAI key  
4. Deploy. The `api/` folder is used as Vercel serverless functions (see `vercel.json`).

After this, the app uses your new Supabase for auth and data and your new GitHub repo for code; behavior stays the same.
