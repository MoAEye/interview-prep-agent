import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

function unquoteEnvValue(s) {
  let v = String(s).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Loads `.env.local` with the same rules as `scripts/local-api-server.mjs`.
 * Many legacy handlers used `process.env[k] = m[2].trim()` which keeps wrapping quotes and
 * breaks `VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` after the first API import.
 */
export function loadEnvLocalSafe() {
  try {
    const libDir = path.dirname(fileURLToPath(import.meta.url));
    const dirs = [path.resolve(libDir, "../.."), process.cwd(), path.resolve(process.cwd(), "..")];
    for (const dir of dirs) {
      const p = path.join(dir, ".env.local");
      if (!fs.existsSync(p)) continue;
      let content = fs.readFileSync(p, "utf8");
      content = content.replace(/^\uFEFF/, "");
      for (const line of content.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        const val = unquoteEnvValue(m[2]).trim();
        if (val === "") continue;
        process.env[m[1]] = val;
      }
      return;
    }
  } catch (_) {}
}
