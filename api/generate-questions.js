import OpenAI from "openai";
import { resolveCandidateFromRequest, countInterviewSessionsThisUtcMonth } from "./_lib/candidateAuth.js";
import {
  resolveRequestedCount,
  resolveSecondsPerQuestion,
  isMonthlyInterviewLimitExceeded,
  normalizeGenerateQuestionsBody,
  buildQuestionsResponsePack,
} from "./_lib/generateQuestionsPolicy.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_WAIT_MS = 5000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local and restart (npm run start)." });
    return;
  }
  try {
    const resolved = await resolveCandidateFromRequest(req);
    if (resolved.error) {
      res.status(500).json({ error: resolved.error });
      return;
    }
    if (resolved.badToken) {
      res.status(401).json({ error: "Invalid or expired session. Sign in again." });
      return;
    }

    if (resolved.authed && !resolved.isPro) {
      const { count } = await countInterviewSessionsThisUtcMonth(resolved.supabaseService, resolved.userId);
      if (isMonthlyInterviewLimitExceeded(count)) {
        res.status(403).json({
          error:
            "You've reached the Free plan limit of 3 mock interviews this month (UTC). Upgrade to Pro for unlimited practice.",
          code: "MONTHLY_INTERVIEW_LIMIT",
        });
        return;
      }
    }

    const { cvText, jobDescription, jobTitle, difficultyFocus } = normalizeGenerateQuestionsBody(req.body);
    const resolvedShape = { authed: resolved.authed, isPro: resolved.isPro };
    const COUNT = resolveRequestedCount(resolvedShape, req.body);
    const secondsPerQuestion = resolveSecondsPerQuestion(
      req.body?.seconds_per_question ?? req.body?.secondsPerQuestion
    );

    const diffInstruction =
      difficultyFocus === "easier"
        ? "Difficulty: favor slightly easier, confidence-building questions with clear prompts; keep them realistic for the role."
        : difficultyFocus === "tougher"
          ? "Difficulty: include a stronger share of challenging, probing questions (depth, edge cases) appropriate to this level."
          : "Difficulty: vary from foundational to tough across the set in a balanced way.";

    let completion;
    let lastError;
    for (let attempt = 1; attempt <= RATE_LIMIT_RETRIES; attempt++) {
      try {
        completion = await client.chat.completions.create({
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
- ${diffInstruction}
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

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    res.status(200).json({
      ...buildQuestionsResponsePack(parsed, COUNT),
      seconds_per_question: secondsPerQuestion,
      question_count: COUNT,
      difficulty_focus: difficultyFocus,
    });
  } catch (error) {
    captureApiException(error, { route: "generate-questions" });
    const msg = error?.message || "";
    let userMsg = "Failed to generate questions.";
    if (msg.includes("401") || msg.includes("Incorrect API key")) userMsg = "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local.";
    if (msg.includes("429")) userMsg = "OpenAI rate limit. Wait a moment and try again.";
    console.error("generate-questions error:", error && (error.stack || error.message || error));
    res.status(500).json({ error: userMsg });
  }
}
