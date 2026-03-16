# Easiest: link to your new Vercel (no CLI)

**1.** Push this folder to GitHub (if you haven't):
- Create a new repo on GitHub (e.g. `interview-prep-agent`).
- In this folder run:
  ```bash
  git init
  git add .
  git commit -m "Initial"
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  git branch -M main
  git push -u origin main
  ```

**2.** On Vercel: [vercel.com](https://vercel.com) → **Add New** → **Project** → **Import** your GitHub repo (connect GitHub if asked). Click **Import**.

**3.** Before deploying, open **Environment Variables** and add:
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `OPENAI_API_KEY` = your OpenAI key

**4.** Click **Deploy**. Done. Future pushes to `main` will auto-deploy.
