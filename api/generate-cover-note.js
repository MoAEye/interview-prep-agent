import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import OpenAI from "openai";

function loadEnvLocal() {
  try {
    const dirs = [path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), process.cwd()];
    for (const dir of dirs) {
      const p = path.join(dir, ".env.local");
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8");
        content.split("\n").forEach((line) => {
          const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
          if (m) process.env[m[1]] = m[2].trim();
        });
        return;
      }
    }
  } catch (_) {}
}
loadEnvLocal();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key is missing." });
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
    const msg = err?.message || "";
    let userMsg = "Failed to generate cover note.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key.";
    if (msg.includes("429")) userMsg = "Rate limit. Wait a moment and try again.";
    console.error("generate-cover-note error:", err);
    return res.status(500).json({ error: userMsg });
  }
}
