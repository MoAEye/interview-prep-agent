#!/usr/bin/env node
/**
 * Pre-deploy checks: required env for Vite build + Vercel API (no secrets printed).
 * Run locally before production: npm run check:deploy
 *
 * Set in Vercel → Project → Settings → Environment Variables (Production):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SENTRY_DSN, VITE_SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE
 *
 * Supabase → Authentication → URL configuration:
 *   Site URL = your production origin (e.g. https://app.example.com)
 *   Redirect URLs = production + http://localhost:5173 (and preview URLs if needed)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function unquote(s) {
  let v = String(s).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  let content = fs.readFileSync(filePath, "utf8");
  content = content.replace(/^\uFEFF/, "");
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = unquote(m[2]);
  }
  return out;
}

const fileEnv = { ...parseEnvFile(path.join(root, ".env")), ...parseEnvFile(path.join(root, ".env.local")) };
const env = { ...fileEnv, ...process.env };

function fail(msg) {
  console.error("\n[check:deploy] FAILED:", msg);
  process.exit(1);
}

function ok(msg) {
  console.log("  ✓", msg);
}

const url = (env.VITE_SUPABASE_URL || "").trim();
const anon = (env.VITE_SUPABASE_ANON_KEY || "").trim();
const service = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const openai = (env.OPENAI_API_KEY || "").trim();

console.log("\n=== Deploy environment check (project root) ===\n");

if (!url.startsWith("https://")) fail("VITE_SUPABASE_URL must start with https://");
try {
  if (!new URL(url).hostname.toLowerCase().endsWith(".supabase.co")) {
    fail("VITE_SUPABASE_URL host should be *.supabase.co");
  }
} catch {
  fail("VITE_SUPABASE_URL is not a valid URL");
}
if (/your-project-ref|placeholder|xxxxx/i.test(url)) fail("VITE_SUPABASE_URL still looks like a placeholder");
ok("VITE_SUPABASE_URL shape");

if (anon.length < 32 || /your-anon|placeholder|not-configured/i.test(anon.toLowerCase())) {
  fail("VITE_SUPABASE_ANON_KEY missing or too short / placeholder");
}
ok("VITE_SUPABASE_ANON_KEY present");

if (service.length < 32) {
  fail("SUPABASE_SERVICE_ROLE_KEY missing or too short (required for server APIs / user_profiles)");
}
ok("SUPABASE_SERVICE_ROLE_KEY present");

if (
  !/^sk-[a-zA-Z0-9_-]{10,}/.test(openai) &&
  !/^sk-proj-[a-zA-Z0-9_-]{10,}/.test(openai)
) {
  fail("OPENAI_API_KEY should look like sk-… or sk-proj-…");
}
if (/your-openai|placeholder|example|xxxxx/i.test(openai)) {
  fail("OPENAI_API_KEY still looks like a placeholder — use a real key from OpenAI");
}
ok("OPENAI_API_KEY shape");

if (env.VITE_SENTRY_DSN || env.SENTRY_DSN) {
  ok("Sentry DSN(s) set (optional — errors will be reported when configured)");
} else {
  console.log("  · Sentry optional: set VITE_SENTRY_DSN (browser) + SENTRY_DSN (Vercel server) for error monitoring");
}

console.log(`
--- Supabase Auth (manual in dashboard) ---
  Authentication → URL configuration:
  · Site URL: your live app URL (https://…)
  · Redirect URLs: include that URL + http://localhost:5173 for local dev
`);

console.log("=== All required deploy variables look OK ===\n");
