/**
 * Shared response headers for API routes (Vercel + local Node server).
 * @param {import("http").ServerResponse} res
 */
export function setApiSecurityHeaders(res) {
  if (!res || res.headersSent) return;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

const MAX_AI_INPUT = 1_200_000;

/**
 * Remove null bytes and cap length for text sent to the model or stored.
 * @param {string} s
 * @returns {string}
 */
export function sanitizeAiInput(s) {
  if (typeof s !== "string") return "";
  let t = s.replace(/\u0000/g, "");
  t = t.trim();
  if (t.length > MAX_AI_INPUT) t = t.slice(0, MAX_AI_INPUT);
  return t;
}

function getClientId(req) {
  const h = req.headers || {};
  const xff = h["x-forwarded-for"] || h["X-Forwarded-For"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim() || "unknown";
  }
  const real = h["x-real-ip"] || h["X-Real-IP"];
  if (typeof real === "string" && real.trim()) return real.trim();
  if (req.socket && typeof req.socket.remoteAddress === "string") {
    return req.socket.remoteAddress;
  }
  return "local";
}

const buckets = new Map();

/**
 * Simple in-memory rate limit (sufficient for local dev + single Node process).
 * @param {import("http").IncomingMessage} req
 * @param {any} res Vercel-style { status().json() } or Node response
 * @param {{ limit?: number; windowMs?: number; key?: string }} [opts]
 * @returns {boolean} true to continue, false if 429 was sent
 */
export function applyRateLimit(req, res, opts = {}) {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const id = `${opts.key || "default"}|${getClientId(req)}`;
  const now = Date.now();
  let b = buckets.get(id);
  if (!b || now - b.t > windowMs) {
    b = { t: now, c: 0 };
  }
  b.c += 1;
  buckets.set(id, b);
  if (b.c > limit) {
    if (typeof res?.status === "function") {
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
    }
    return false;
  }
  return true;
}
