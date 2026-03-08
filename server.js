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
    res.status(200).json(JSON.parse(text));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/grade-interview', async (req, res) => {
  const { answers } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o", temperature: 0.4,
        messages: [{ role: "user", content: `You are an expert interview coach. Grade this mock interview.\n\nANSWERS:\n${JSON.stringify(answers, null, 2)}\n\nReturn ONLY valid JSON:\n{\n  "overall_score": 75,\n  "star_rating": 3.5,\n  "overall_grade": "B+",\n  "aria_summary": "2-3 sentence spoken summary",\n  "strengths": ["x3"],\n  "improvements": ["x3"],\n  "question_grades": [{ "question": "...", "answer_given": "...", "score": 7, "skipped": false, "what_was_good": "...", "what_to_improve": "...", "ideal_answer": "..." }]\n}\nStar rating 0-5 in 0.5 steps. No extra text, just JSON.` }]
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
    res.status(200).json(JSON.parse(text));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(3001, () => console.log('✅ API server running on port 3001'));
