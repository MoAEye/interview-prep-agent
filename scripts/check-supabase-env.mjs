#!/usr/bin/env node
/**
 * Verifies .env / .env.local for Supabase without printing secrets.
 * Run: npm run check:env
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
  content = content.replace(/^\uFEFF/, ""); // UTF-8 BOM breaks first line
  const dup = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const key = m[1];
      const val = unquote(m[2]);
      if (Object.prototype.hasOwnProperty.call(out, key) && out[key] !== val) {
        dup.push(key);
      }
      out[key] = val;
    }
  }
  if (dup.length) {
    console.warn("  (warning: duplicate keys in " + path.basename(filePath) + ", last value wins: " + [...new Set(dup)].join(", ") + ")");
  }
  return out;
}

function maskUrl(u) {
  if (!u) return "(empty)";
  try {
    const url = new URL(u);
    const ref = url.hostname.replace(/\.supabase\.co$/i, "");
    return `${url.protocol}//${ref.slice(0, 4)}…${ref.slice(-4)}.supabase.co`;
  } catch {
    return "(invalid URL)";
  }
}

const dotEnv = parseEnvFile(path.join(root, ".env"));
const dotEnvLocal = parseEnvFile(path.join(root, ".env.local"));
// .env.local overrides .env (same as Vite)
const merged = { ...dotEnv, ...dotEnvLocal };

const url = merged.VITE_SUPABASE_URL || "";
const key = merged.VITE_SUPABASE_ANON_KEY || "";

console.log("\n--- Supabase env check (project: " + root + ") ---\n");

for (const name of [".env", ".env.local"]) {
  const p = path.join(root, name);
  console.log(name.padEnd(12), fs.existsSync(p) ? "found: " + p : "missing");
}

console.log("\nVITE_SUPABASE_URL");
if (!url) {
  console.log("  status: MISSING — paste Project URL from Supabase → Settings → API");
} else {
  const okHost = (() => {
    try {
      return new URL(url).hostname.toLowerCase().endsWith(".supabase.co");
    } catch {
      return false;
    }
  })();
  const bad =
    /your-project-ref|placeholder|xxxxx/i.test(url) || !url.startsWith("https://");
  console.log("  preview:", maskUrl(url));
  console.log("  https + .supabase.co:", okHost ? "yes" : "no");
  console.log("  looks like placeholder:", bad ? "yes (fix this)" : "no");
}

console.log("\nVITE_SUPABASE_ANON_KEY");
if (!key) {
  console.log("  status: MISSING — paste anon public key (long JWT) from same API page");
} else {
  const bad =
    /your-anon|placeholder|not-configured/i.test(key.toLowerCase()) || key.length < 32;
  console.log("  length:", key.length, bad ? "(too short or placeholder text)" : "(ok length)");
}

const configured =
  url &&
  key &&
  url.startsWith("https://") &&
  (() => {
    try {
      return new URL(url).hostname.toLowerCase().endsWith(".supabase.co");
    } catch {
      return false;
    }
  })() &&
  !/your-project-ref|placeholder|xxxxx/i.test(url) &&
  !/your-anon|placeholder|not-configured/i.test(key.toLowerCase()) &&
  key.length >= 32;

console.log("\n--- Result ---");
if (configured) {
  console.log("OK — env file looks valid. Restart: npm run dev:vite\n");
  process.exit(0);
} else {
  console.log("NOT OK — fix .env.local next to package.json, then: npm run dev:vite\n");
  process.exit(1);
}
