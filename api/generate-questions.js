export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { resume_text, job_description, job_title } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.6,
        messages: [{
          role: "user",
          content: `You are an expert interview coach. Analyse this resume and job description and generate a tailored interview prep pack.

RESUME:
${resume_text}

JOB TITLE: ${job_title}
JOB DESCRIPTION:
${job_description}

Return ONLY valid JSON in this exact format:
{
  "candidate_summary": "2-3 sentence summary of the candidate",
  "job_summary": "2-3 sentence summary of the role",
  "top_resume_signals": ["signal 1", "signal 2", "signal 3", "signal 4", "signal 5"],
  "top_job_priorities": ["priority 1", "priority 2", "priority 3", "priority 4", "priority 5"],
  "likely_weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "match_analysis": {
    "strengths": ["strength 1", "strength 2"],
    "gaps": ["gap 1", "gap 2"],
    "key_focus_areas": ["area 1", "area 2"]
  },
  "interview_questions": [
    {
      "question": "question text",
      "type": "technical|behavioral|experience|situational|gap-probing",
      "targets": "what skill/trait this tests",
      "reason": "why this question matters for this role",
      "relevance_score": 9
    }
  ]
}

Generate exactly 12 questions. No extra text, just JSON.`
        }]
      })
    });
    const data = await response.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
