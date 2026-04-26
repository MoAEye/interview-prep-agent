import { describe, it, expect } from "vitest";
import { applyGradingTier } from "../api/_lib/gradingResponse.js";

describe("applyGradingTier", () => {
  const base = {
    overall_score: 70,
    star_rating: 4,
    summary: "ok",
    strengths: ["a"],
    improvements: ["b"],
    question_grades: [{ question: "Q1", score: 7 }],
  };

  it("strips detail for free tier", () => {
    const out = applyGradingTier(base, "free");
    expect(out.grading_tier).toBe("free");
    expect(out.overall_score).toBe(70);
    expect(out.summary).toBe("ok");
    expect(out.question_grades).toEqual([]);
    expect(out.strengths).toEqual([]);
    expect(out.improvements).toEqual([]);
  });

  it("keeps payload for pro tier", () => {
    const out = applyGradingTier(base, "pro");
    expect(out.grading_tier).toBe("pro");
    expect(out.question_grades).toEqual(base.question_grades);
    expect(out.strengths).toEqual(["a"]);
  });

  it("does not mutate the input object", () => {
    const copy = { ...base, question_grades: [...base.question_grades] };
    applyGradingTier(copy, "free");
    expect(copy.question_grades).toHaveLength(1);
  });
});
