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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) {
      const n = Number(match[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default async function handler(req, res) {
  try {
    const answers = req.body?.answers || req.body?.answersData || [];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You are an interview coach. Return ONLY valid JSON with this exact shape: {"overall_score":number,"star_rating":number,"summary":string,"strengths":string[],"improvements":string[],"question_grades":[{"question":string,"score":number,"answer_given":string,"what_was_good":string,"what_to_improve":string,"ideal_answer":string}]}. Rules: overall_score must be 0-100. star_rating 0-5. Each question score 0-10. Keep summary under 60 words. strengths/improvements max 3 items. Keep fields non-empty when possible. No markdown, no extra text.',
        },
        { role: "user", content: JSON.stringify(answers) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed = {};
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch (err) {
      const scoreMatch = raw.match(/"overall_score"\s*:\s*(\d+(?:\.\d+)?)/);
      const starMatch = raw.match(/"star_rating"\s*:\s*(\d+(?:\.\d+)?)/);
      parsed = {
        overall_score: scoreMatch ? Number(scoreMatch[1]) : 0,
        star_rating: starMatch ? Number(starMatch[1]) : 0,
        summary: "",
        strengths: [],
        improvements: [],
        question_grades: [],
      };
    }

    let overall = clamp(Math.round(safeNumber(parsed?.overall_score)), 0, 100);
    if (overall > 0 && overall <= 10) overall = clamp(Math.round(overall * 10), 0, 100);

    const star = clamp(safeNumber(parsed?.star_rating), 0, 5);

    const question_grades = safeArray(parsed?.question_grades).map((q, i) => ({
      question: typeof q?.question === "string" ? q.question : "",
      score: clamp(safeNumber(q?.score), 0, 10),
      answer_given: typeof q?.answer_given === "string" ? q.answer_given : (typeof q?.answer === "string" ? q.answer : ""),
      what_was_good: typeof q?.what_was_good === "string" ? q.what_was_good : (typeof q?.feedback === "string" ? q.feedback : ""),
      what_to_improve: typeof q?.what_to_improve === "string" ? q.what_to_improve : "",
      ideal_answer: typeof q?.ideal_answer === "string" ? q.ideal_answer : "",
    }));

    const out = {
      overall_score: overall,
      star_rating: star,
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
      strengths: safeArray(parsed?.strengths).filter((x) => typeof x === "string").slice(0, 3),
      improvements: safeArray(parsed?.improvements).filter((x) => typeof x === "string").slice(0, 3),
      question_grades,
    };

    res.status(200).json(out);
  } catch (error) {
    console.error("Grade Interview Error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: "grading_failed" });
  }
}
