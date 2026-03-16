# Quick start (everything links to your new accounts)

1. **New Supabase**  
   Run `supabase/schema.sql` in your new project’s SQL Editor. Copy **Project URL** and **anon public** from Settings → API.

2. **Env (links app to your new Supabase)**  
   ```bash
   npm run setup
   ```  
   Edit `.env.local`: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `OPENAI_API_KEY` (all from your new Supabase + OpenAI).

3. **New GitHub**  
   Create a new repo, then in `app`:  
   ```bash
   git init && git add . && git commit -m "Initial"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main && git push -u origin main
   ```

4. **New Vercel**  
   Vercel → Add New → Project → Import your new GitHub repo. Add the same 3 env vars, then Deploy.

5. **Run locally**  
   ```bash
   npm run start
   ```

See **README.md** for the full step-by-step.
