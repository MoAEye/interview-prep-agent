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
    const moduleTitle = String(body.moduleTitle || body.lessonTitle || "").trim();
    const moduleTopic = String(body.moduleTopic || body.lessonDescription || "").trim();
    if (!moduleTitle) {
      res.status(400).json({ error: "moduleTitle is required." });
      return;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write practical interview-skills lessons (UK professional English). Return ONLY valid JSON:
{"content": string (markdown body, use ## for sections and bullet lists),
 "practiceQuestion": string (one clear practice prompt for the learner)}
The lesson should be thorough, actionable, and readable in about the stated duration.`,
        },
        {
          role: "user",
          content: JSON.stringify({ moduleTitle, moduleTopic }),
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

    res.status(200).json({
      content:
        typeof parsed.content === "string"
          ? parsed.content
          : "# Lesson\n\nContent could not be generated. Please try again.",
      practiceQuestion:
        typeof parsed.practiceQuestion === "string"
          ? parsed.practiceQuestion
          : "Write a short answer (5–8 sentences) applying the main idea of this module to your own experience.",
    });
  } catch (error) {
    captureApiException(error, { route: "academy-content" });
    const msg = error?.message || "";
    let userMsg = "Lesson generation failed.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Try again shortly.";
    console.error("academy-content error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
