# Step-by-step: what to do exactly

Do these in order. Your keys are already in **OPEN-THIS-FILE-ADD-YOUR-KEYS.txt** in this project — the commands below use that file.

---

## One block: copy and paste into Terminal

Open **Terminal** (Cmd + Space → type **Terminal** → Enter), then paste this **whole block** and press Enter.

```bash
cd /Users/mohammed/Desktop/interview-prep-agent-clean
npm run fix-vercel
npm run use-keys
npm run start
```

When you see **Ready! Available at http://localhost:3000** (or 3001), open that URL in your browser. Leave Terminal open.

If you get **“Could not retrieve Project Settings”**, the first command (`npm run fix-vercel`) removes the broken Vercel link so `start` can run. Run the block again after that.

---

## If you prefer to run commands one by one

**1. Open Terminal**  
Cmd + Space → type **Terminal** → Enter.

**2. Go to project and load keys**

```bash
cd /Users/mohammed/Desktop/interview-prep-agent-clean
npm run use-keys
```

**3. Start the app**

```bash
npm run start
```

Wait until you see: **Ready! Available at http://localhost:3000** (or 3001). Leave Terminal open.

---

## 6. Open the app in your browser

- Open **Chrome** (or any browser).
- Go to: **http://localhost:3000**  
  (or **http://localhost:3001** if that’s what step 5 showed).
- You should see the Interview Prep Agent landing page.

---

## 7. Sign in (or try without signing up)

- Click **Get started** (or similar).
- If you see a login/sign-up screen: sign in with your email and password.
- If there’s a **“Try without signing up”** option, you can use that to test (nothing will be saved).

---

## 8. Save your CV once (Profile)

- In the app, click **Profile** (or **👤 Profile**) in the top/nav area.
- Fill in:
  - **What job are you looking for?** (e.g. Software Engineer)
  - **Where in the UK?** (e.g. London, Manchester, or Remote)
  - **Your CV:** paste your full CV in the big text box.
- Click **Save profile**.
- You should see **✓ Saved** or similar.
- Click **← Back** to go back to the main form.

---

## 9. Generate interview questions (one flow)

- On the main “Prepare for your interview” screen:
  - If you saved a profile: click **“Use my saved profile”** so CV and job title fill in.
  - In **Job Description**, paste the full job description for the role you’re prepping for.
- Click **Generate Interview Questions**.
- Wait a few seconds. You should get a list of questions and summaries.
- Click **Start interview** (or similar) and do the mock interview.
- When you’re done, you’ll see a report and score.

---

## 10. If something goes wrong

- **“OpenAI API key is missing” or “Invalid API key”**  
  → Check **OPEN-THIS-FILE-ADD-YOUR-KEYS.txt** has a valid `OPENAI_API_KEY=sk-...` line, save, then run `npm run use-keys` again and `npm run start`.

- **“OpenAI rate limit”**  
  → Wait 1–2 minutes and try again. The app will retry automatically a few times.

- **“Could not retrieve Project Settings”**  
  → Run: `npm run fix-vercel` then `npm run start` again. If Vercel asks “Link to existing project?”, you can link your Vercel project or skip; the app should still run locally.

- **App won’t load or port in use**  
  → In Terminal press **Ctrl+C** to stop the app. Then run `npm run start` again. If it says port 3000 is in use, use the URL it gives you (e.g. 3001).

- **Supabase / login errors**  
  → Check **OPEN-THIS-FILE-ADD-YOUR-KEYS.txt** has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, save, run `npm run use-keys`, then restart with `npm run start`.

---

## 11. Stop the app when you’re done

- Go to the Terminal window where the app is running.
- Press **Ctrl+C**.
- The app will stop. To start again later, run `npm run start` from the project folder again.

---

## Quick checklist

- [ ] Terminal open, in folder: `interview-prep-agent-clean`
- [ ] Keys in **OPEN-THIS-FILE-ADD-YOUR-KEYS.txt** and saved
- [ ] Ran **npm run use-keys**
- [ ] Ran **npm run start** and saw “Ready! Available at http://...”
- [ ] Opened that URL in the browser
- [ ] Signed in (or tried without signing up)
- [ ] Saved CV in Profile, then used “Use my saved profile” and generated questions once

If all of that works, you’re set. For the next phases (job tracker, documents, etc.), use **PRODUCT-UPGRADE-PLAN.md** and **PHASE1-CHECKLIST.md** when you’re ready.
