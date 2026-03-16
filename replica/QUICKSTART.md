# Get running in 3 steps

**1. Setup (one command)**  
```bash
npm run setup
```

**2. Add your keys**  
Open `.env.local` and replace the placeholders with your real values:
- `VITE_SUPABASE_URL` — from Supabase → Settings → API → Project URL  
- `VITE_SUPABASE_ANON_KEY` — from Supabase → Settings → API → anon public  
- `OPENAI_API_KEY` — your OpenAI API key  

**3. Run the app**  
```bash
npm run start
```

Then open the URL it shows (e.g. http://localhost:3000). Done.
