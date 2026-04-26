import OpenAI from "openai";
import { resolveCandidateFromRequest } from "./_lib/candidateAuth.js";
import { applyGradingTier } from "./_lib/gradingResponse.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Build user message for grading: optional CV / JD / role title, then answers JSON. Omits empty sections. */
export function buildGradingUserContent(answers, { cv_text, job_description, job_title } = {}) {
  const cv = typeof cv_text === "string" ? cv_text.trim() : "";
  const jd = typeof job_description === "string" ? job_description.trim() : "";
  const role = typeof job_title === "string" ? job_title.trim() : "";
  const blocks = [];
  if (cv) blocks.push(`CV (candidate resume):\n${cv}`);
  if (jd) blocks.push(`Job description:\n${jd}`);
  if (role) blocks.push(`Role title:\n${role}`);
  const ctx = [];
  if (cv) {
    ctx.push(
      "CONTEXT: CV is provided — check whether answers align with what the candidate claims. If they claim expertise but give a weak answer, penalise harder."
    );
  }
  if (jd) {
    ctx.push(
      "CONTEXT: Job description is provided — grade answers against what this specific role requires. An answer fine for a junior role scores lower if the JD implies senior expectations."
    );
  }
  if (!cv && !jd) {
    ctx.push("CONTEXT: No CV or job description — grade using general professional interview standards.");
  }
  if (ctx.length) blocks.push(ctx.join("\n"));
  blocks.push(
    "Each item in the array may include: question, answer (text), skipped (boolean). Use skipped and answer text exactly as given.\n\nInterview answers (JSON array):\n" +
      JSON.stringify(answers)
  );
  return blocks.join("\n\n---\n\n");
}

const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_WAIT_MS = 5000;

/**
 * Model returns per-question scores on 0–100 per prompt; finalizeGrading maps to 0–10 for API/UI.
 */
const GRADING_SYSTEM_PROMPT = `You are a strict senior interviewer grading a real job interview. 
Return ONLY valid JSON with this exact shape:
{"overall_score":number,"star_rating":number,"summary":string,"strengths":string[],"improvements":string[],"question_grades":[{"question":string,"score":number,"answer_given":string,"what_was_good":string,"what_to_improve":string,"ideal_answer":string}]}

SCORING — follow exactly, no exceptions:
- Skipped/blank/empty: score 0. Feedback: Question was skipped.
- Under 10 words: score 5-15. Too brief.
- Vague/generic/no detail: score 10-25.
- Irrelevant (even if long): score 5-20. Relevance is #1 factor.
- Partial/missing depth: score 30-55.
- Good/relevant/specific: score 55-75.
- Excellent/structured/examples: score 75-95.
- Perfect (very rare): score 95-100.

Overall score: do NOT average. Skipped questions drag score down 
heavily. Most mixed-answer candidates score 20-50 overall.

Star rating: 0-20=1star, 21-40=2stars, 41-60=3stars, 
61-80=4stars, 81-100=5stars.

If CV provided: penalise harder when answers contradict claimed 
experience. If JD provided: grade against role requirements.

You do NOT give benefit of the doubt. Grade what was written, 
not what was meant. Only give 70+ when genuinely impressed. 
Only give 90+ for truly exceptional answers. Be harsh but fair.

Rules: overall_score 0-100. star_rating 1-5. question score 
0-100. Summary under 60 words. Max 3 strengths/improvements. 
No markdown. No extra text outside JSON.`;

function countWords(text) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function isAnswerSkipped(ans) {
  if (!ans || typeof ans !== "object") return true;
  if (ans.skipped === true) return true;
  const a = typeof ans.answer === "string" ? ans.answer.trim() : "";
  return a.length === 0;
}

/** Prompt uses 0–100 per question; API keeps 0–10 for each question_grades[].score. */
function modelQuestionScoreToTen(raw) {
  const r = safeNumber(raw);
  return clamp(Math.round(r / 10), 0, 10);
}

/** Merge model output with server rules; recompute overall from enforced per-question scores. Covered by `tests/grade-interview.test.js`. */
export function finalizeGrading(answersInput, parsed) {
  const answers = safeArray(answersInput);
  const modelGrades = safeArray(parsed?.question_grades);
  const n =
    answers.length > 0 ? answers.length : modelGrades.length > 0 ? modelGrades.length : 0;
  if (n === 0) {
    return {
      overall_score: 0,
      star_rating: 1,
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
      strengths: safeArray(parsed?.strengths).filter((x) => typeof x === "string").slice(0, 3),
      improvements: safeArray(parsed?.improvements).filter((x) => typeof x === "string").slice(0, 3),
      question_grades: [],
    };
  }

  const row = (i) => {
    const ans = answers[i] || {};
    const mg = modelGrades[i] || {};
    const qText =
      typeof ans.question === "string" && ans.question.trim()
        ? ans.question
        : typeof mg.question === "string"
          ? mg.question
          : "";
    let answerGiven =
      typeof mg.answer_given === "string"
        ? mg.answer_given
        : typeof ans.answer === "string"
          ? ans.answer
          : "";
    const rawModelScore = safeNumber(mg.score);
    let score = modelQuestionScoreToTen(rawModelScore);
    let whatGood = typeof mg.what_was_good === "string" ? mg.what_was_good : "";
    let whatImprove = typeof mg.what_to_improve === "string" ? mg.what_to_improve : "";
    const ideal = typeof mg.ideal_answer === "string" ? mg.ideal_answer : "";

    const skipped = isAnswerSkipped(ans);
    const words = countWords(typeof ans.answer === "string" ? ans.answer : answerGiven);

    if (skipped) {
      score = 0;
      whatImprove = "Question was skipped.";
      whatGood = "";
    } else if (words < 10) {
      score = clamp(score, 1, 2);
      if (whatImprove && !/too brief|brief/i.test(whatImprove)) {
        whatImprove = `${whatImprove} Too brief.`.trim();
      } else if (!whatImprove) {
        whatImprove = "Too brief.";
      }
    }

    return {
      question: qText,
      score,
      answer_given: answerGiven,
      what_was_good: whatGood,
      what_to_improve: whatImprove,
      ideal_answer: ideal,
      _skipped: skipped,
    };
  };

  const built = [];
  for (let i = 0; i < n; i++) built.push(row(i));

  const scores = built.map((b) => b.score);
  const allSkipped = built.length > 0 && built.every((b) => b._skipped);
  let overall;
  if (allSkipped) {
    overall = 0;
  } else {
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const minQ = Math.min(...scores);
    overall = Math.round(0.45 * (minQ / 10) * 100 + 0.55 * (avg / 10) * 100);
    const trivial = scores.filter((s) => s <= 2).length;
    if (trivial >= Math.ceil(scores.length * 0.6) && !allSkipped) {
      overall = Math.min(overall, 28);
    }
    overall = clamp(overall, 0, 100);
  }

  const star_rating = overall <= 20 ? 1 : overall <= 40 ? 2 : overall <= 60 ? 3 : overall <= 80 ? 4 : 5;

  const question_grades = built.map(({ _skipped, ...rest }) => rest);

  return {
    overall_score: overall,
    star_rating,
    summary: typeof parsed?.summary === "string" ? parsed.summary : "",
    strengths: safeArray(parsed?.strengths).filter((x) => typeof x === "string").slice(0, 3),
    improvements: safeArray(parsed?.improvements).filter((x) => typeof x === "string").slice(0, 3),
    question_grades,
  };
}

export default async function handler(req, res) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local and restart." });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const answers = body.answers || body.answersData || [];
    const userContent = buildGradingUserContent(answers, {
      cv_text: body.cv_text,
      job_description: body.job_description,
      job_title: body.job_title,
    });

    let completion;
    let lastError;
    for (let attempt = 1; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      try {
        completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: GRADING_SYSTEM_PROMPT,
        },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
        });
        break;
      } catch (err) {
        lastError = err;
        const isRateLimit = (err?.message || "").includes("429") || err?.status === 429;
        if (isRateLimit && attempt < RATE_LIMIT_RETRIES) {
          await sleep(RATE_LIMIT_WAIT_MS);
          continue;
        }
        throw err;
      }
    }
    if (!completion) throw lastError;

    const raw = completion?.choices?.[0]?.message?.content || "";

    // Remove markdown fences if any
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    // Extract JSON object if wrapped
    let parsed = {};
    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch (err) {
      // Last resort: salvage score fields so UI never NaNs
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

    let out = finalizeGrading(answers, parsed);

    const resolved = await resolveCandidateFromRequest(req);
    if (resolved.error) {
      return res.status(500).json({ error: resolved.error });
    }
    if (resolved.badToken) {
      return res.status(401).json({ error: "Invalid or expired session. Sign in again." });
    }
    const tier = resolved.authed && !resolved.isPro ? "free" : "pro";
    out = applyGradingTier(out, tier);

    res.status(200).json(out);
  } catch (error) {
    captureApiException(error, { route: "grade-interview" });
    const msg = error?.message || String(error);
    console.error("Grade Interview Error:", error && (error.stack || error.message || error));
    const isKey =
      /401|Incorrect API key|invalid_api_key|invalid x-api-key/i.test(msg) ||
      error?.status === 401;
    if (isKey) {
      return res.status(500).json({ error: "Invalid or missing OpenAI API key. Check OPENAI_API_KEY in .env.local." });
    }
    res.status(500).json({ error: "grading_failed" });
  }
}
