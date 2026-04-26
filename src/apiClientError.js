/**
 * Turns fetch failures into actionable copy when /api/* is missing in Vite-only dev.
 */
export function messageForFailedApiResponse(res, data) {
  const raw = data?.error ?? res.statusText ?? "";
  const msg = typeof raw === "string" && raw.trim() ? raw.trim() : "Request failed. Please try again.";

  // Local API returns JSON { error: "Not found", path } for unregistered routes (misleading if shown as "no API").
  if (
    res.status === 404 &&
    data?.path &&
    String(data.error || "").toLowerCase() === "not found"
  ) {
    return `Something on port 8787 answered but doesn’t handle ${data.path} (often an old local API still running). Stop it: run \`lsof -ti :8787 | xargs kill -9\` (Mac/Linux), then \`npm run dev:vite\` again. If you already updated the repo, the new server includes this route — you just need a fresh process on 8787.`;
  }

  // Vite-only dev returns 404 for /api/* (no proxy / no serverless routes).
  if (res.status === 404 && (!data?.error || String(data.error).toLowerCase() === "not found")) {
    return "Interview API is not available (404 on /api). Stop any extra Vite terminal, then from the project root run: npm run dev:vite — you must see both [api] and [vite] in one terminal. Or use npm run dev (Vercel). Check http://127.0.0.1:8787/api/health . See START-HERE.md.";
  }

  return msg;
}
