import OpenAI from "openai";
import { resolveCandidateFromRequest } from "./_lib/candidateAuth.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key is missing." });
  }
  const resolved = await resolveCandidateFromRequest(req);
  if (resolved.error) return res.status(500).json({ error: resolved.error });
  if (resolved.badToken) return res.status(401).json({ error: "Sign in required." });
  if (!resolved.authed || !resolved.isPro) {
    return res.status(403).json({ error: "AI cover notes are a Pro feature.", code: "PRO_REQUIRED" });
  }
  try {
    const body = req.body || {};
    const cvText = body.cv_text || body.cvText || "";
    const jobTitle = body.job_title || body.jobTitle || "";
    const company = body.company || "";
    const jobDescription = body.job_description || body.jobDescription || "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write short, punchy cover notes for LinkedIn or email (2–4 sentences). Be professional and specific. Output only the note text, no subject line or labels."
        },
        {
          role: "user",
          content: `CV:\n${cvText}\n\nJob: ${jobTitle}${company ? ` at ${company}` : ""}\nDescription:\n${jobDescription}\n\nWrite a short cover note:`
        }
      ],
      max_tokens: 300
    });

    const coverNote = completion?.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ cover_note: coverNote });
  } catch (err) {
    captureApiException(err, { route: "generate-cover-note" });
    const msg = err?.message || "";
    let userMsg = "Failed to generate cover note.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "Rate limit. Wait a moment and try again.";
    console.error("generate-cover-note error:", err);
    return res.status(500).json({ error: userMsg });
  }
}
