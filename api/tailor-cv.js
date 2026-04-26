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
    const jobDescription = String(body.jobDescription || body.job_description || "").trim();
    if (!cvText || cvText.length < 50) {
      res.status(400).json({ error: "Paste a CV (at least a few lines)." });
      return;
    }
    if (!jobDescription || jobDescription.length < 30) {
      res.status(400).json({ error: "Paste the full job description." });
      return;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert CV writer and career coach.
Rewrite the candidate's CV to be perfectly tailored for the job description provided.

Rules:
- Keep all factual information accurate (don't invent experience)
- Rewrite bullet points to use keywords from the job description
- Restructure the order of experience to highlight most relevant
- Strengthen weak bullet points with stronger action verbs
- Match the seniority level expected by the role
- Keep the same overall structure but optimise every line
- Make it ATS-friendly (Applicant Tracking System)

Return ONLY valid JSON:
{
  "tailoredCV": string (full rewritten CV),
  "changes": string[] (key changes made),
  "matchScore": number (0-100),
  "tips": string[] (3 additional tips for this application)
}
No markdown fences.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            cvText: cvText.slice(0, 24000),
            jobDescription: jobDescription.slice(0, 24000),
          }),
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    const parsed = parseModelJsonObject(raw);

    let matchScore = Math.round(Number(parsed.matchScore ?? parsed.match_score));
    if (!Number.isFinite(matchScore)) matchScore = 70;
    matchScore = Math.min(100, Math.max(0, matchScore));

    const tailored =
      typeof parsed.tailoredCV === "string"
        ? parsed.tailoredCV
        : typeof parsed.tailored_cv === "string"
          ? parsed.tailored_cv
          : "";

    if (!tailored.trim()) {
      res.status(502).json({
        error: "Could not read the tailored CV from the model. Try again or shorten your inputs.",
      });
      return;
    }

    res.status(200).json({
      tailoredCV: tailored,
      changes: safeArray(parsed.changes).filter((x) => typeof x === "string").slice(0, 20),
      matchScore,
      tips: safeArray(parsed.tips).filter((x) => typeof x === "string").slice(0, 6),
    });
  } catch (error) {
    captureApiException(error, { route: "tailor-cv" });
    const msg = error?.message || "";
    let userMsg = "Could not tailor CV.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Try again shortly.";
    console.error("tailor-cv error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
