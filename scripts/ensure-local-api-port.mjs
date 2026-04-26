/**
 * Before starting local-api-server or Vite (proxied API), free port 8787 unless a
 * CURRENT local-api is already there (GET /api/health has ok + routes listing analyse-cv and aria-tts).
 *
 * Any other listener (stale API, wrong app) gets SIGTERM then SIGKILL so the new
 * server can bind — fixes 404 on /api/analyse-cv when an old process still owns 8787.
 */
import http from "http";
import { execSync } from "child_process";

const port = Number(process.env.LOCAL_API_PORT || process.env.PORT || 8787);

function getHealth() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/health",
        method: "GET",
        timeout: 1500,
      },
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

function isFreshLocalApi(body) {
  if (!body || body.ok !== true) return false;
  const svc = String(body.service || "");
  /** health.js uses interview-prep-agent; older builds used local-api */
  if (svc !== "local-api" && svc !== "interview-prep-agent") return false;
  const routes = body.routes;
  if (!Array.isArray(routes)) return false;
  const joined = routes.map(String).join(" ");
  /** Must include newer routes or we keep a stale process that 404s e.g. POST /api/aria-tts. */
  return joined.includes("analyse-cv") && joined.includes("aria-tts");
}

/** LISTEN only — `lsof -ti :port` on macOS also matches outbound clients and can include *this* script. */
function pidsListeningOnPort(p) {
  if (process.platform === "win32") return [];
  try {
    const out = execSync(`lsof -nP -iTCP:${p} -sTCP:LISTEN -t 2>/dev/null || true`, {
      encoding: "utf8",
      shell: true,
    }).trim();
    const mine = String(process.pid);
    return out
      .split("\n")
      .filter(Boolean)
      .filter((pid) => String(pid) !== mine);
  } catch {
    return [];
  }
}

function killListenersOnPort(p, signal) {
  if (process.platform === "win32") {
    console.warn(
      `[ensure-local-api-port] Port ${p}: free it manually or run: npx kill-port ${p}  (Windows)`
    );
    return;
  }
  const pids = pidsListeningOnPort(p);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), signal);
    } catch {
      /* ignore */
    }
  }
  if (pids.length && signal === "SIGTERM") {
    console.log(`[ensure-local-api-port] Sent SIGTERM to ${pids.length} process(es) on port ${p}.`);
  }
}

async function main() {
  const r = await getHealth();

  if (r.status === 0) {
    return;
  }

  if (isFreshLocalApi(r.body)) {
    return;
  }

  const why =
    r.status === 404
      ? "404 on /api/health (stale or unknown server)"
      : !r.body?.ok
        ? "not InterviewAI API on this port"
        : "local-api /api/health does not list analyse-cv + aria-tts (outdated process)";

  console.log(`[ensure-local-api-port] Port ${port}: ${why}. Replacing listener(s).`);
  killListenersOnPort(port, "SIGTERM");
  await new Promise((x) => setTimeout(x, 600));
  killListenersOnPort(port, "SIGKILL");
  await new Promise((x) => setTimeout(x, 250));
}

main().catch((e) => {
  console.warn("[ensure-local-api-port]", e?.message || e);
});
