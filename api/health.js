/**
 * GET /api/health — cheap check for uptime monitors and `npm run smoke`.
 * No auth. Does not call OpenAI or Supabase.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({
    ok: true,
    service: "interview-prep-agent",
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    supabase_api_configured: Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    time: new Date().toISOString(),
    /** Used by scripts/ensure-local-api-port.mjs to detect a current local API on :8787 */
    routes: [
      "POST /api/generate-questions",
      "POST /api/grade-interview",
      "POST /api/analyse-cv",
      "POST /api/aria-coach",
      "POST /api/aria-tts",
    ],
  });
}
