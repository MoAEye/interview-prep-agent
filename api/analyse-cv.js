import OpenAI from "openai";
import { requireCandidateSession } from "./_lib/candidateAuth.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function parseModelJsonObject(raw) {
  let s = String(raw || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local." });
    return;
  }
  const authed = await requireCandidateSession(req, res, { requirePro: true });
  if (!authed) return;
  try {
    const body = req.body || {};
    const cvText = String(body.cvText || body.cv_text || "").trim();
    if (!cvText || cvText.length < 40) {
      res.status(400).json({ error: "Paste your CV (at least a short paragraph)." });
      return;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert CV reviewer with 10+ years recruiting experience. Analyse this CV and return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "subScores": { "clarity": number, "relevance": number, "impact": number, "atsFriendliness": number },
  "improvements": [{ "priority": "high"|"medium"|"low", "section": string, "issue": string, "suggestion": string, "example": string }],
  "rewrittenBullets": [{ "original": string, "improved": string, "reason": string }]
}
Rules:
- improvements: 5–10 items, specific and actionable.
- rewrittenBullets: 2–3 weakest bullets rewritten; use real text from the CV for "original".
- All subScores 0–100.
No markdown fences.`,
        },
        {
          role: "user",
          content: cvText.slice(0, 24000),
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    const parsed = parseModelJsonObject(raw);

    const subRaw = parsed.subScores || parsed.sub_scores;
    const sub = subRaw && typeof subRaw === "object" ? subRaw : {};
    const improvements = safeArray(parsed.improvements)
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        priority: ["high", "medium", "low"].includes(x.priority) ? x.priority : "medium",
        section: String(x.section || ""),
        issue: String(x.issue || ""),
        suggestion: String(x.suggestion || ""),
        example: String(x.example || ""),
      }))
      .slice(0, 12);

    const rewrittenBullets = safeArray(parsed.rewrittenBullets || parsed.rewritten_bullets)
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        original: String(x.original || ""),
        improved: String(x.improved || ""),
        reason: String(x.reason || ""),
      }))
      .slice(0, 5);

    let overallScore = Math.round(Number(parsed.overallScore ?? parsed.overall_score));
    if (!Number.isFinite(overallScore)) overallScore = 55;
    overallScore = Math.min(100, Math.max(0, overallScore));

    const clamp = (n) => {
      const v = Math.round(Number(n));
      if (!Number.isFinite(v)) return 50;
      return Math.min(100, Math.max(0, v));
    };

    res.status(200).json({
      overallScore,
      subScores: {
        clarity: clamp(sub.clarity),
        relevance: clamp(sub.relevance),
        impact: clamp(sub.impact),
        atsFriendliness: clamp(sub.atsFriendliness ?? sub.ats_friendliness),
      },
      improvements,
      rewrittenBullets,
    });
  } catch (error) {
    captureApiException(error, { route: "analyse-cv" });
    const msg = error?.message || "";
    let userMsg = "CV analysis failed.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Try again shortly.";
    console.error("analyse-cv error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
