const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

/** Strip optional quotes (common when pasting from docs). Vite's parser does this; we must match for process.env. */
function unquoteEnvValue(s) {
  let v = String(s).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const val = unquoteEnvValue(m[2]).trim();
      // Don't wipe parent env (e.g. cross-env DEV_API_PROXY_TARGET) with blank lines in .env.local
      if (val === "") return;
      process.env[m[1]] = val;
    }
  });
}

// Env-based tokens often break `vercel dev` — CLI should use `vercel login` session instead.
for (const key of ["VERCEL_TOKEN", "VERCEL_ACCESS_TOKEN", "VERCEL_OIDC_TOKEN"]) {
  if (process.env[key]) {
    console.warn(`[run-with-env] Unset ${key} for this process (use \`npx vercel login\`, not tokens in .env).`);
    delete process.env[key];
  }
}

const mode = process.argv[2];
const isViteOnly = mode === "vite" || mode === "--vite";

if (isViteOnly) {
  const ensureScript = path.join(__dirname, "scripts", "ensure-local-api-port.mjs");
  if (fs.existsSync(ensureScript)) {
    spawnSync(process.execPath, [ensureScript], { stdio: "inherit", cwd: __dirname, env: process.env });
  }
}

const child = isViteOnly
  ? spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["vite"],
      { stdio: "inherit", shell: true, env: process.env, cwd: __dirname }
    )
  : (() => {
      console.log(
        "[run-with-env] Starting Vercel dev. If you see 'token is not valid': run `npx vercel logout` then `npx vercel login`. Or run `npm run dev:local` (no Vercel)."
      );
      return spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["vercel", "dev", "--yes"],
        { stdio: "inherit", shell: true, env: process.env, cwd: __dirname }
      );
    })();

child.on("exit", (code) => process.exit(code || 0));
