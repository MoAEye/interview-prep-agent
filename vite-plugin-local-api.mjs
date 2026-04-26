import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

/**
 * Wait for another process (e.g. concurrently [api]) to expose GET /api/health.
 */
function getHealth(port) {
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
            const j = JSON.parse(b);
            resolve(j?.ok === true ? j : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function waitForExistingApi(port, maxMs) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const j = await getHealth(port);
    if (j?.ok) return true;
    await new Promise((r) => setTimeout(r, 280));
  }
  return false;
}

async function waitUntilReady(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const j = await getHealth(port);
    if (j?.ok) return;
    await new Promise((r) => setTimeout(r, 320));
  }
  throw new Error(`GET /api/health on :${port} did not return ok within ${timeoutMs}ms`);
}

/**
 * In dev, if nothing answers on LOCAL_API_PORT, spawn scripts/local-api-server.mjs
 * so `npx vite` / dev:ui-only still get /api via the Vite proxy.
 * Skips when an API is already up (including `npm run dev` with concurrently).
 */
export function ariaLocalApiPlugin({ root, port = 8787 }) {
  let child = null;
  let spawnedByUs = false;

  return {
    name: "aria-local-api-autostart",
    apply: "serve",
    async configureServer(server) {
      if (process.env.VITE_SKIP_LOCAL_API === "1") return;
      if (process.env.CI === "1") return;

      const p = Number(process.env.LOCAL_API_PORT || port);

      const existing = await waitForExistingApi(p, 18000);
      if (existing) {
        console.log(`\n\x1b[32m[aria]\x1b[0m Using local API already on :${p}\n`);
        return;
      }

      const ensure = path.join(root, "scripts", "ensure-local-api-port.mjs");
      spawnSync(process.execPath, [ensure], { cwd: root, stdio: "inherit", env: process.env });

      const script = path.join(root, "scripts", "local-api-server.mjs");
      console.log(`\n\x1b[36m[aria]\x1b[0m Starting local API on :${p} (Vite plugin)…\n`);

      child = spawn(process.execPath, [script], {
        cwd: root,
        env: { ...process.env, LOCAL_API_PORT: String(p) },
        stdio: "inherit",
      });
      spawnedByUs = true;

      child.on("error", (e) => {
        console.error("\x1b[31m[aria]\x1b[0m Failed to spawn local API:", e?.message || e);
      });

      try {
        await waitUntilReady(p, 25000);
        console.log(`\x1b[32m[aria]\x1b[0m Local API ready — http://127.0.0.1:${p}/api/health\n`);
      } catch (e) {
        const recovered = await getHealth(p);
        if (recovered?.ok) {
          console.log(
            `\x1b[32m[aria]\x1b[0m Local API is up on :${p} (another process won the bind race).\n`
          );
          spawnedByUs = false;
          child = null;
          return;
        }
        console.error(`\x1b[31m[aria]\x1b[0m ${e?.message || e}`);
        console.error(
          "\x1b[31m[aria]\x1b[0m Fix: run \x1b[1mnpm run api:local\x1b[0m in another terminal, or \x1b[1mnpm run dev\x1b[0m from the project root.\n"
        );
        if (child && !child.killed) {
          try {
            child.kill("SIGTERM");
          } catch {
            /* ignore */
          }
        }
        spawnedByUs = false;
        child = null;
        return;
      }

      const stop = () => {
        if (!spawnedByUs || !child || child.killed) return;
        try {
          child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      };
      server.httpServer?.on("close", stop);
      process.once("exit", stop);
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    },
  };
}
