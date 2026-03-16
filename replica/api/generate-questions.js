import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COUNT = 8; // <-- change to 10 if you want 10 questions

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const cvText = body.cvText || body.resume_text || body.resumeText || "";
    const jobDescription = body.jobDescription || body.job_description || "";
    const jobTitle = body.jobTitle || body.job_title || body.title || "";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `You are an interview coach. Return ONLY valid JSON in this exact shape:
{"candidate_summary":string,"job_summary":string,"top_resume_signals":string[],"top_job_priorities":string[],"likely_weaknesses":string[],"questions":[{"question":string,"type":string,"reason":string,"targets":string,"relevance_score":number}]}
Rules:
- candidate_summary max 60 words
- job_summary max 60 words
- top_resume_signals max 5 items
- top_job_priorities max 5 items
- likely_weaknesses max 5 items
- Generate exactly ${COUNT} questions tailored to CV + job description + job title
- reason under 20 words
- targets can be empty string
- relevance_score must be 1-10
No markdown. No extra text.`,
        },
        {
          role: "user",
          content: JSON.stringify({ cvText, jobTitle, jobDescription }),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const pack = {
      candidate_summary:
        typeof parsed?.candidate_summary === "string" ? parsed.candidate_summary : "",
      job_summary: typeof parsed?.job_summary === "string" ? parsed.job_summary : "",
      top_resume_signals: safeArray(parsed?.top_resume_signals)
        .filter((x) => typeof x === "string")
        .slice(0, 5),
      top_job_priorities: safeArray(parsed?.top_job_priorities)
        .filter((x) => typeof x === "string")
        .slice(0, 5),
      likely_weaknesses: safeArray(parsed?.likely_weaknesses)
        .filter((x) => typeof x === "string")
        .slice(0, 5),
      questions: safeArray(parsed?.questions)
        .slice(0, COUNT)
        .map((q) => ({
          question: typeof q?.question === "string" ? q.question : "",
          type: typeof q?.type === "string" ? q.type : "general",
          reason: typeof q?.reason === "string" ? q.reason : "",
          targets: typeof q?.targets === "string" ? q.targets : "",
          relevance_score: Number.isFinite(Number(q?.relevance_score))
            ? Number(q.relevance_score)
            : 5,
        }))
        .filter((q) => q.question),
    };

    res.status(200).json(pack);
  } catch (error) {
    console.error("generate-questions error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: "Failed to generate questions" });
  }
}
