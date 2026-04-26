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
    return res.status(403).json({ error: "Cover letters are a Pro feature.", code: "PRO_REQUIRED" });
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
          content: "You are a professional cover letter writer. Write a clear, tailored cover letter (3–5 short paragraphs) based on the candidate's CV and the job. Use a professional tone. Output only the cover letter text, no headings or labels."
        },
        {
          role: "user",
          content: `CV:\n${cvText}\n\nJob title: ${jobTitle}\nCompany: ${company}\nJob description:\n${jobDescription}\n\nWrite the cover letter:`
        }
      ],
      max_tokens: 1000
    });

    const coverLetter = completion?.choices?.[0]?.message?.content?.trim() || "";
    return res.status(200).json({ cover_letter: coverLetter });
  } catch (err) {
    captureApiException(err, { route: "generate-cover-letter" });
    const msg = err?.message || "";
    let userMsg = "Failed to generate cover letter.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "Rate limit. Wait a moment and try again.";
    console.error("generate-cover-letter error:", err);
    return res.status(500).json({ error: userMsg });
  }
}
