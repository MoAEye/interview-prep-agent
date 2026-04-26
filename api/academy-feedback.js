import OpenAI from "openai";
import { requireCandidateSession } from "./_lib/candidateAuth.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local." });
    return;
  }
  const authed = await requireCandidateSession(req, res, { requirePro: true });
  if (!authed) return;
  try {
    const body = req.body || {};
    const lessonTitle = String(body.lessonTitle || "").trim();
    const practicePrompt = String(body.practicePrompt || "").trim();
    const userAnswer = String(body.userAnswer || "").trim();
    if (!userAnswer || userAnswer.length < 20) {
      res.status(400).json({ error: "Write at least 2–3 sentences for feedback." });
      return;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You coach interview answers. Return ONLY valid JSON:
{"score":number,"feedback":string,"next_step":string}
Rules:
- score: integer 1–10 for structure, clarity, and relevance (not truthfulness of claims).
- feedback: 2–4 sentences, specific and kind.
- next_step: one sentence what to improve next.
No markdown.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            lessonTitle,
            practicePrompt,
            userAnswer: userAnswer.slice(0, 8000),
          }),
        },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    let score = Math.round(Number(parsed.score));
    if (!Number.isFinite(score)) score = 6;
    score = Math.min(10, Math.max(1, score));

    res.status(200).json({
      score,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      next_step: typeof parsed.next_step === "string" ? parsed.next_step : "",
    });
  } catch (error) {
    captureApiException(error, { route: "academy-feedback" });
    const msg = error?.message || "";
    let userMsg = "Feedback failed.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Try again shortly.";
    console.error("academy-feedback error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
