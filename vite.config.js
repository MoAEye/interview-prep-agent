import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { ariaLocalApiPlugin } from "./vite-plugin-local-api.mjs";

/** Folder that contains vite.config.js + package.json + .env.local (not process.cwd() if the shell is wrong). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Proxy /api to local API server (npm run dev / dev:local / api:local on :8787).
// 1) DEV_API_PROXY_TARGET from env or .env.local wins if set.
// 2) In `vite` serve, default to http://127.0.0.1:8787 so the proxy works even if env was dropped.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const fromFile = env.DEV_API_PROXY_TARGET || "";
  const fromProcess = process.env.DEV_API_PROXY_TARGET || "";
  // Use `command` (not `mode`) so Vite + proxy + API autostart work for any dev mode, e.g. `vite --mode staging`.
  const isDevServer = command === "serve";
  const defaultDevApi = isDevServer ? "http://127.0.0.1:8787" : "";
  let apiProxyTarget = (fromProcess || fromFile || defaultDevApi).trim();
  if (isDevServer && !apiProxyTarget) {
    apiProxyTarget = "http://127.0.0.1:8787";
  }
  if (isDevServer && apiProxyTarget) {
    try {
      const u = new URL(apiProxyTarget);
      if (u.port && u.port !== "8787") {
        console.warn(
          `\n\x1b[33m[aria]\x1b[0m /api is proxied to \x1b[1m${apiProxyTarget}\x1b[0m. The local Aria API runs on \x1b[1m:8787\x1b[0m. In \x1b[1m.env.local\x1b[0m set \x1b[1mDEV_API_PROXY_TARGET=http://127.0.0.1:8787\x1b[0m or remove the line. Wrong port → “Could not reach the interview API” in the app.\n`
        );
      }
    } catch {
      /* ignore invalid target */
    }
  }

  const server = {
    headers: {
      "Cache-Control": "no-store",
    },
  };
  if (apiProxyTarget) {
    server.proxy = {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        /** Some dev setups drop Authorization before the request hits :8787 — force-forward. */
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const auth = req.headers.authorization;
            if (auth) proxyReq.setHeader("Authorization", auth);
          });
        },
      },
    };
  }

  return {
    root: projectRoot,
    envDir: projectRoot,
    // True only when the app is built/served by `vite` (not `vite build`). apiCall.js uses this in dev.
    define: {
      "import.meta.env.ARIA_VITE_SERVE": JSON.stringify(command === "serve"),
    },
    plugins: [tailwindcss(), react(), isDevServer ? ariaLocalApiPlugin({ root: projectRoot }) : null].filter(
      Boolean
    ),
    resolve: {
      alias: {
        "@": path.join(projectRoot, "src"),
      },
    },
    server,
  };
});
