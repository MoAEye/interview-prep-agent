import OpenAI from "openai";

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

export default async function handler(req, res) {
  console.log("DEBUG grade-interview hit", {
    method: req.method,
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {}),
  });

  try {
    const answers = req.body?.answers || req.body?.answersData || [];

    console.log("DEBUG before openai");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You are an interview coach. Return ONLY valid JSON with this exact shape: {"overall_score": number, "star_rating": number, "summary": string, "strengths": string[], "improvements": string[], "question_grades": [{"question": string, "score": number, "feedback": string}]}. Keep summary under 60 words. Keep strengths and improvements to max 3 short items each. Keep each question feedback under 20 words. Do not include answer_given, what_was_good, what_to_improve, or ideal_answer. No markdown. No extra text.',
        },
        {
          role: "user",
          content: JSON.stringify(answers),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    console.log("DEBUG openai raw", raw);

    let parsed = {};

    try {
      const cleaned = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};

      if (!match) {
        console.error("No JSON found in GPT response:", cleaned);
      }
    } catch (err) {
      console.error("JSON parse failed. Raw GPT output:", raw);

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

    parsed.overall_score = clamp(
      Math.round(safeNumber(parsed.overall_score)),
      0,
      100
    );

    parsed.star_rating = clamp(
      safeNumber(parsed.star_rating),
      0,
      5
    );

    if (!Array.isArray(parsed.strengths)) {
      parsed.strengths = [];
    }

    if (!Array.isArray(parsed.improvements)) {
      parsed.improvements = [];
    }

    if (!Array.isArray(parsed.question_grades)) {
      parsed.question_grades = [];
    }

    parsed.question_grades = parsed.question_grades.map((q) => ({
      question: q?.question || "",
      score: clamp(safeNumber(q?.score), 0, 10),
      feedback: q?.feedback || "",
    }));

    console.log("DEBUG parsed result", parsed);
    res.status(200).json(parsed);
  } catch (error) {
    console.error(
      "Grade Interview Error:",
      error && (error.stack || error.message || error)
    );
    res.status(500).json({ error: "grading_failed" });
  }
}
