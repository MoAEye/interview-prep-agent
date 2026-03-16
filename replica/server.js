import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/generate-questions', async (req, res) => {
  const { resume_text, job_description, job_title } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o", temperature: 0.6,
        messages: [{ role: "user", content: `You are an expert interview coach. Analyse this resume and job description and generate a tailored interview prep pack.\n\nRESUME:\n${resume_text}\n\nJOB TITLE: ${job_title}\nJOB DESCRIPTION:\n${job_description}\n\nReturn ONLY valid JSON:\n{\n  "candidate_summary": "...",\n  "job_summary": "...",\n  "top_resume_signals": ["x5"],\n  "top_job_priorities": ["x5"],\n  "likely_weaknesses": ["x3"],\n  "match_analysis": { "strengths": [], "gaps": [], "key_focus_areas": [] },\n  "interview_questions": [{ "question": "...", "type": "technical|behavioral|experience|situational|gap-probing", "targets": "...", "reason": "...", "relevance_score": 9 }]\n}\nGenerate exactly 12 questions. No extra text, just JSON.` }]
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);

parsed.overall_score = Number(parsed.overall_score) || 0;
parsed.star_rating = Number(parsed.star_rating) || 0;

if (Array.isArray(parsed.question_grades)) {
  parsed.question_grades = parsed.question_grades.map(q => ({
    ...q,
    score: Number(q.score) || 0
  }));
}


function safeNumber(value, fallback = 0) {
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  return fallback;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

app.post("/grade-interview", async (req, res) => {
  try {
    const { text } = req.body;

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }

    parsed.overall_score = clamp(safeNumber(parsed.overall_score, 0), 0, 100);
    parsed.star_rating = clamp(safeNumber(parsed.star_rating, 0), 0, 5);

    if (!Array.isArray(parsed.question_grades)) {
      parsed.question_grades = [];
    }

    parsed.question_grades = parsed.question_grades.map((q) => ({
      question: q?.question || "",
      score: clamp(safeNumber(q?.score, 0), 0, 10),
      feedback: q?.feedback || "No feedback provided"
    }));

    res.status(200).json(parsed);

  } catch (error) {
    console.error("Grading error:", error);

    res.status(200).json({
      overall_score: 0,
      star_rating: 0,
      question_grades: [],
      feedback: "Grading failed but system recovered safely."
    });
  }
});

