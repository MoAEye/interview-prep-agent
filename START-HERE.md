# Run the app (same as before)

**Do not paste JSON into the terminal.** Edit `package.json` in Cursor/VS Code if you need to change scripts.

## Full stack — **recommended**

```bash
npm run dev
```

You should see **Vercel CLI** output (not plain “VITE ready”).  
Open the URL it prints (often **http://localhost:3000**).

First time: `npx vercel login` and `npx vercel link`.

### “The specified token is not valid”

1. Remove from **`.env.local`**: any `VERCEL_TOKEN=`, `VERCEL_ACCESS_TOKEN=`, `VERCEL_OIDC_TOKEN=`.
2. Reset CLI login:
   ```bash
   npx vercel logout
   npx vercel login
   ```
3. Try `npm run dev` again (and `npx vercel link` in this folder if asked).

If you **don’t** want to use Vercel right now:

```bash
npm run dev:local
```

If `npm run dev` still runs **only Vite** (`localhost:5173`), your `package.json` is wrong. It must contain:

```json
"dev": "node run-with-env.js"
```

(`npm run start` is the same command.)

## Local dev on port 5173 (no Vercel) — **recommended**

```bash
npm run dev:vite
```

This **always** starts **local API (:8787) + Vite (:5173)** in one terminal (via `concurrently`), with **`DEV_API_PROXY_TARGET`** set so `/api` is never “orphaned.” Open **http://localhost:5173**. Put **`OPENAI_API_KEY`** and Supabase **`VITE_*`** vars in **`.env.local`**.

**If you still see “404 on /api”:** (1) Stop all other dev servers (`Ctrl+C` in every terminal). (2) Run **`npm run dev:vite`** once — you should see **both** `[api]` and `[vite]` logs. (3) In a browser open **`http://127.0.0.1:8787/api/health`** — if that fails, the API isn’t running (port **8787** busy? kill the old process). (4) Hard-refresh **http://localhost:5173** (`Cmd+Shift+R`).

### Prefer no local API at all?

Use **`npm run dev`** (Vercel): one URL (often **:3000**), `/api` is built-in. After you **deploy to Vercel**, production works the same way (no proxy). I can still edit code in this repo in Cursor; **you** (or Git auto-deploy) still need to **push** for the live site to update.

### UI only (no `/api`)

```bash
npm run dev:ui-only
```

Use this only for quick UI work. **Generate questions / grading will fail** until you use **`npm run dev:vite`** or **`npm run dev`** (Vercel).

## Test grading logic (no OpenAI)

Checks skip/brief caps, overall score, and star bands (offline):

```bash
npm run test:grade
```
