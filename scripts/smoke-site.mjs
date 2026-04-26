#!/usr/bin/env node
/**
 * Lightweight production checks (run from your machine — not from CI without secrets).
 *
 * Usage:
 *   SMOKE_URL=https://your-app.vercel.app npm run smoke
 *
 * Local (Vite + API proxy):
 *   SMOKE_URL=http://localhost:5173 npm run smoke
 *
 * Checks: site returns HTML with #root, GET /api/health returns { ok: true }.
 */
import process from "node:process";

const raw = (process.env.SMOKE_URL || process.argv[2] || "").trim().replace(/\/$/, "");
if (!raw || !/^https?:\/\//i.test(raw)) {
  console.error(`
Usage:
  SMOKE_URL=https://your-production-url.com npm run smoke

Or:
  npm run smoke -- https://your-production-url.com
`);
  process.exit(1);
}

function fail(msg) {
  console.error("[smoke] FAIL:", msg);
  process.exit(1);
}

async function main() {
  const origin = raw;

  const pageRes = await fetch(origin, {
    redirect: "follow",
    headers: { Accept: "text/html" },
  });
  if (!pageRes.ok) fail(`GET ${origin} → HTTP ${pageRes.status}`);
  const html = await pageRes.text();
  if (!/id=["']root["']/.test(html) && !html.includes("root")) {
    fail(`GET ${origin} — expected SPA shell (looked for #root)`);
  }
  console.log("[smoke] OK:", origin, "→ HTML", pageRes.status);

  const healthUrl = `${origin}/api/health`;
  const healthRes = await fetch(healthUrl);
  if (!healthRes.ok) fail(`GET ${healthUrl} → HTTP ${healthRes.status}`);
  let j;
  try {
    j = await healthRes.json();
  } catch {
    fail(`${healthUrl} — response was not JSON`);
  }
  if (!j?.ok) fail(`${healthUrl} — body missing ok: true (${JSON.stringify(j)})`);
  console.log("[smoke] OK:", healthUrl, "→", j);
  console.log("\n[smoke] Pass — still sign in manually for full flow (mock interview, grade).");
}

main().catch((e) => fail(e?.message || String(e)));
