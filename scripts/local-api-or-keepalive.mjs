/**
 * For `npm run dev` (concurrently [api] + [vite]): if the Aria local API
 * is already up on :8787 from a previous run, do not start a second server
 * (would hit EADDRINUSE and -k would kill Vite). Otherwise start it.
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const localApi = path.join(root, "scripts", "local-api-server.mjs");
const port = Number(process.env.LOCAL_API_PORT || 8787);

function getHealthJson() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/health", method: "GET", timeout: 2000 },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(b) });
          } catch {
            resolve({ status: res.statusCode, body: null });
          }
        });
      }
    );
    req.on("error", () => resolve({ status: 0, body: null }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: null });
    });
    req.end();
  });
}

function isUsableLocalApi(body) {
  if (!body || body.ok !== true) return false;
  const svc = String(body.service || "");
  if (svc !== "local-api" && svc !== "interview-prep-agent") return false;
  return true;
}

/**
 * A never-resolving Promise does not always keep the Node process alive; under ESM
 * the event loop can reach “idle” and exit 0, which `concurrently -k` then treats
 * as “api done” and kills Vite. Hold a timer ref and wait forever.
 */
function runUntilSigint() {
  setInterval(() => {}, 0x7fffffff);
  return new Promise((resolve) => {
    for (const sig of ["SIGINT", "SIGTERM"]) {
      process.on(sig, () => resolve(0));
    }
  });
}

async function main() {
  const r = await getHealthJson();
  if (r.status === 200 && isUsableLocalApi(r.body)) {
    console.log(
      `\n\x1b[32m[aria]\x1b[0m Reusing Aria local API on :${port} (another process is already running).\n`
    );
    await runUntilSigint();
    return;
  }
  const child = spawn(process.execPath, [localApi], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, LOCAL_API_PORT: String(port) },
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code == null ? 1 : code);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
