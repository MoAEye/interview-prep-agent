# Link to your new Vercel

1. Use **your new GitHub repo** (the one you pushed this `app` to).
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → **Import** that repo.
3. In the Vercel project, add **Environment Variables** (same as your `.env.local`):
   - `VITE_SUPABASE_URL` — from your new Supabase
   - `VITE_SUPABASE_ANON_KEY` — from your new Supabase  
   - `OPENAI_API_KEY` — your OpenAI key
4. **Deploy**.

The deployed app will use only these env vars (and thus only your new Supabase and OpenAI). No old project links.
