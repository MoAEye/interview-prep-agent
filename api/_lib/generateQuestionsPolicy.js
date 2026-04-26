import {
  FREE_MONTHLY_INTERVIEW_LIMIT,
  FREE_QUESTION_COUNT,
  PRO_QUESTION_COUNT,
} from "./candidateAuth.js";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

/** Guest / signed-out: 10 questions; signed-in free: 5; Pro: 10. */
export function resolveQuestionCount({ authed, isPro }) {
  if (!authed) return 10;
  return isPro ? PRO_QUESTION_COUNT : FREE_QUESTION_COUNT;
}

/**
 * @param {object} resolved from resolveCandidateFromRequest shape: { authed, isPro }
 * @param {object} [body] raw request body
 * @returns {number} 3..max for plan, respects optional question_count
 */
export function resolveRequestedCount(resolved, body) {
  const maxQ = resolveQuestionCount(resolved);
  const b = body && typeof body === "object" ? body : {};
  const raw = b.question_count ?? b.num_questions ?? b.questionCount;
  if (raw == null || raw === "") return maxQ;
  const v = Math.floor(Number(raw));
  if (!Number.isFinite(v)) return maxQ;
  return Math.min(maxQ, Math.max(3, v));
}

/** 0 = no per-question timer; otherwise 15–120 clamped. */
export function resolveSecondsPerQuestion(v) {
  if (v === 0 || v === "0" || v === "off" || v === "none") return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 30;
  if (n <= 30) return 30;
  if (n <= 45) return 45;
  if (n <= 60) return 60;
  return 60;
}

export function isMonthlyInterviewLimitExceeded(count, limit = FREE_MONTHLY_INTERVIEW_LIMIT) {
  return (count ?? 0) >= limit;
}

export function normalizeGenerateQuestionsBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const cvText = b.cvText || b.resume_text || b.resumeText || "";
  const jobDescription = b.jobDescription || b.job_description || "";
  const jobTitle = b.jobTitle || b.job_title || b.title || "";
  let df = b.difficulty_focus || b.difficulty;
  if (typeof df === "string") {
    const d = df.trim().toLowerCase();
    if (d === "easier" || d === "foundational" || d === "easy") df = "easier";
    else if (d === "tougher" || d === "harder" || d === "challenging" || d === "hard") df = "tougher";
    else df = "balanced";
  } else {
    df = "balanced";
  }
  return {
    cvText,
    jobDescription,
    jobTitle,
    difficultyFocus: df,
  };
}

/** Normalizes OpenAI JSON into the API response shape (caps lists, slices question count). */
export function buildQuestionsResponsePack(parsed, COUNT) {
  return {
    candidate_summary: typeof parsed?.candidate_summary === "string" ? parsed.candidate_summary : "",
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
        relevance_score: Number.isFinite(Number(q?.relevance_score)) ? Number(q.relevance_score) : 5,
      }))
      .filter((q) => q.question),
  };
}
