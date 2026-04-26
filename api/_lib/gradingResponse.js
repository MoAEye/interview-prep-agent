/**
 * Free candidates get headline scores only; per-question breakdown is stripped server-side.
 * @param {object} out - finalizeGrading output
 * @param {"free" | "pro"} tier
 */
export function applyGradingTier(out, tier) {
  if (tier === "free") {
    return {
      ...out,
      grading_tier: "free",
      question_grades: [],
      strengths: [],
      improvements: [],
    };
  }
  return { ...out, grading_tier: "pro" };
}
