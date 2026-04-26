import { describe, it, expect } from "vitest";
import { finalizeGrading, buildGradingUserContent } from "../api/grade-interview.js";

describe("finalizeGrading", () => {
  it("returns zeros and empty grades when there are no answers", () => {
    const out = finalizeGrading([], { summary: "x", question_grades: [] });
    expect(out.overall_score).toBe(0);
    expect(out.star_rating).toBe(1);
    expect(out.question_grades).toEqual([]);
    expect(out.summary).toBe("x");
  });

  it("forces overall 0, star 1, and skip feedback when all questions skipped", () => {
    const answers = [
      { question: "Q1", answer: "", skipped: true },
      { question: "Q2", answer: "", skipped: true },
    ];
    const parsed = {
      overall_score: 99,
      star_rating: 5,
      summary: "ignore",
      strengths: [],
      improvements: [],
      question_grades: [
        { question: "Q1", score: 100, answer_given: "", what_was_good: "x", what_to_improve: "y", ideal_answer: "" },
        { question: "Q2", score: 100, answer_given: "", what_was_good: "x", what_to_improve: "y", ideal_answer: "" },
      ],
    };
    const out = finalizeGrading(answers, parsed);
    expect(out.overall_score).toBe(0);
    expect(out.star_rating).toBe(1);
    expect(out.question_grades.every((g) => g.score === 0)).toBe(true);
    expect(out.question_grades.every((g) => g.what_to_improve === "Question was skipped.")).toBe(true);
  });

  it("clamps brief answers (<10 words) to 1–2 /10 and adds brief feedback", () => {
    const answers = [{ question: "Q1", answer: "Yes absolutely.", skipped: false }];
    const parsed = {
      overall_score: 90,
      star_rating: 5,
      summary: "",
      strengths: [],
      improvements: [],
      question_grades: [
        {
          question: "Q1",
          score: 95,
          answer_given: "Yes absolutely.",
          what_was_good: "",
          what_to_improve: "",
          ideal_answer: "",
        },
      ],
    };
    const out = finalizeGrading(answers, parsed);
    expect(out.question_grades[0].score).toBeGreaterThanOrEqual(1);
    expect(out.question_grades[0].score).toBeLessThanOrEqual(2);
    expect(/too brief|brief/i.test(out.question_grades[0].what_to_improve)).toBe(true);
  });

  it("maps model 0–100 per question to 0–10 and aligns overall + stars", () => {
    const answers = [
      { question: "Q1", answer: "One two three four five six seven eight nine ten eleven.", skipped: false },
      { question: "Q2", answer: "One two three four five six seven eight nine ten eleven.", skipped: false },
    ];
    const parsed = {
      overall_score: 100,
      star_rating: 5,
      summary: "ok",
      strengths: ["a"],
      improvements: ["b"],
      question_grades: [
        { question: "Q1", score: 70, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q2", score: 70, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
      ],
    };
    const out = finalizeGrading(answers, parsed);
    expect(out.question_grades[0].score).toBe(7);
    expect(out.question_grades[1].score).toBe(7);
    expect(out.overall_score).toBe(70);
    expect(out.star_rating).toBe(4);
  });

  it("pulls overall down when one question is skipped and another is strong", () => {
    const answers = [
      { question: "Q1", answer: "", skipped: true },
      {
        question: "Q2",
        answer: "One two three four five six seven eight nine ten eleven twelve thirteen.",
        skipped: false,
      },
    ];
    const parsed = {
      overall_score: 100,
      star_rating: 5,
      summary: "",
      strengths: [],
      improvements: [],
      question_grades: [
        { question: "Q1", score: 0, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q2", score: 80, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
      ],
    };
    const out = finalizeGrading(answers, parsed);
    expect(out.question_grades[0].score).toBe(0);
    expect(out.question_grades[1].score).toBe(8);
    expect(out.overall_score).toBe(22);
    expect(out.star_rating).toBe(2);
  });

  it("caps overall at 28 when ≥60% of answers are trivial (score ≤2) but raw overall would be higher", () => {
    const long = "One two three four five six seven eight nine ten eleven.";
    const answers = [
      { question: "Q1", answer: "a b c d e f g h i", skipped: false },
      { question: "Q2", answer: "a b c d e f g h i", skipped: false },
      { question: "Q3", answer: "a b c d e f g h i", skipped: false },
      { question: "Q4", answer: long, skipped: false },
      { question: "Q5", answer: long, skipped: false },
    ];
    const parsed = {
      overall_score: 100,
      star_rating: 5,
      summary: "",
      strengths: [],
      improvements: [],
      question_grades: [
        { question: "Q1", score: 95, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q2", score: 95, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q3", score: 95, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q4", score: 80, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
        { question: "Q5", score: 80, answer_given: "", what_was_good: "", what_to_improve: "", ideal_answer: "" },
      ],
    };
    const out = finalizeGrading(answers, parsed);
    expect(out.question_grades.slice(0, 3).every((g) => g.score <= 2)).toBe(true);
    expect(out.question_grades[3].score).toBe(8);
    expect(out.question_grades[4].score).toBe(8);
    expect(out.overall_score).toBe(28);
  });
});

describe("buildGradingUserContent", () => {
  const answers = [{ question: "Hi?", answer: "Ok.", skipped: false }];

  it("includes general context when no CV or JD", () => {
    const s = buildGradingUserContent(answers);
    expect(s).toContain("No CV or job description");
    expect(s).toContain(JSON.stringify(answers));
  });

  it("includes CV block and CV-specific context when cv_text set", () => {
    const s = buildGradingUserContent(answers, { cv_text: "  Engineer  " });
    expect(s).toContain("CV (candidate resume):\nEngineer");
    expect(s).toContain("CV is provided");
    expect(s).not.toContain("No CV or job description");
  });

  it("includes JD block and JD-specific context when job_description set", () => {
    const s = buildGradingUserContent(answers, { job_description: "Senior role" });
    expect(s).toContain("Job description:\nSenior role");
    expect(s).toContain("Job description is provided");
  });

  it("includes role title when job_title set", () => {
    const s = buildGradingUserContent(answers, { job_title: " PM " });
    expect(s).toContain("Role title:\nPM");
  });
});
