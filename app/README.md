# Interview Prep Agent

This app is set up to use **your new** Supabase, GitHub, and Vercel. Follow the steps below to link everything.

---

## 1. Your new Supabase

1. Go to [supabase.com](https://supabase.com) and open **your new project** (or create one).
2. **SQL Editor** → **New query** → paste the contents of **`supabase/schema.sql`** → **Run**.
3. **Settings** → **API**:
   - Copy **Project URL** → you’ll use this as `VITE_SUPABASE_URL`
   - Copy **anon public** key → you’ll use this as `VITE_SUPABASE_ANON_KEY`
4. **Authentication** → **Providers** → ensure **Email** is enabled (for sign up / sign in).

---

## 2. Environment variables (local)

All links to your new Supabase (and OpenAI) go through `.env.local`. No URLs are hardcoded in the app.

From the **`app`** folder:

```bash
npm run setup
```

Then open **`.env.local`** and set (use the values from your **new** Supabase project):

- **`VITE_SUPABASE_URL`** = Project URL from Supabase → Settings → API  
- **`VITE_SUPABASE_ANON_KEY`** = anon public key from Supabase → Settings → API  
- **`OPENAI_API_KEY`** = your OpenAI API key  

The app only talks to the Supabase project and API keys you put here.

---

## 3. Your new GitHub repo

1. On GitHub, create a **new** repository (empty, no README).
2. In the **`app`** folder, run (replace `YOUR_USERNAME` and `YOUR_REPO` with your new repo):

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

After this, this project is linked to your new GitHub repo; all future pushes go there.

---

## 4. Your new Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in with the account you want to use.
2. **Add New** → **Project** → **Import** the **new GitHub repo** you used in step 3 (connect GitHub if asked).
3. Before deploying, open **Environment Variables** and add the **same three** variables (again from your **new** Supabase and OpenAI):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
4. Click **Deploy**.

Your app and API will then run on Vercel using your new Supabase and OpenAI keys. No old project URLs are used.

---

## Run locally

From the **`app`** folder, after step 2:

```bash
npm run start
```

(If prompted, run `vercel login` once.) The app will use the Supabase and OpenAI keys from `.env.local` (your new Supabase).

---

## Summary

| Link to        | Where it’s set |
|----------------|----------------|
| **New Supabase** | `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and same vars in Vercel |
| **New GitHub**   | `git remote add origin ...` (your new repo URL) |
| **New Vercel**   | Import your new GitHub repo and add the 3 env vars in the Vercel project |

Everything is driven by env vars and the repo you push to; there are no hardcoded Supabase or GitHub URLs in the app, so it’s fully linked to whatever new Supabase, GitHub, and Vercel you configure above.
