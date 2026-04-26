import { describe, it, expect } from "vitest";
import {
  resolveQuestionCount,
  resolveRequestedCount,
  resolveSecondsPerQuestion,
  isMonthlyInterviewLimitExceeded,
  normalizeGenerateQuestionsBody,
  buildQuestionsResponsePack,
} from "../api/_lib/generateQuestionsPolicy.js";

describe("resolveQuestionCount", () => {
  it("returns 10 for guests", () => {
    expect(resolveQuestionCount({ authed: false, isPro: false })).toBe(10);
    expect(resolveQuestionCount({ authed: false, isPro: true })).toBe(10);
  });
  it("returns 5 for signed-in free", () => {
    expect(resolveQuestionCount({ authed: true, isPro: false })).toBe(5);
  });
  it("returns 10 for Pro", () => {
    expect(resolveQuestionCount({ authed: true, isPro: true })).toBe(10);
  });
});

describe("isMonthlyInterviewLimitExceeded", () => {
  it("is false below limit", () => {
    expect(isMonthlyInterviewLimitExceeded(0)).toBe(false);
    expect(isMonthlyInterviewLimitExceeded(2)).toBe(false);
  });
  it("is true at or above default limit (3)", () => {
    expect(isMonthlyInterviewLimitExceeded(3)).toBe(true);
    expect(isMonthlyInterviewLimitExceeded(99)).toBe(true);
  });
  it("respects custom limit", () => {
    expect(isMonthlyInterviewLimitExceeded(2, 2)).toBe(true);
    expect(isMonthlyInterviewLimitExceeded(1, 2)).toBe(false);
  });
});

describe("normalizeGenerateQuestionsBody", () => {
  it("handles null and non-objects", () => {
    expect(normalizeGenerateQuestionsBody(null)).toEqual({
      cvText: "",
      jobDescription: "",
      jobTitle: "",
      difficultyFocus: "balanced",
    });
    expect(normalizeGenerateQuestionsBody("x")).toEqual({
      cvText: "",
      jobDescription: "",
      jobTitle: "",
      difficultyFocus: "balanced",
    });
  });
  it("maps snake_case and alternate keys", () => {
    expect(
      normalizeGenerateQuestionsBody({
        resume_text: "CV",
        job_description: "JD",
        title: "Role",
      })
    ).toEqual({ cvText: "CV", jobDescription: "JD", jobTitle: "Role", difficultyFocus: "balanced" });
  });
  it("prefers camelCase when both present", () => {
    expect(
      normalizeGenerateQuestionsBody({
        cvText: "A",
        resume_text: "B",
      })
    ).toEqual({ cvText: "A", jobDescription: "", jobTitle: "", difficultyFocus: "balanced" });
  });
  it("normalizes difficulty choices", () => {
    expect(normalizeGenerateQuestionsBody({ difficulty: "harder" }).difficultyFocus).toBe("tougher");
    expect(normalizeGenerateQuestionsBody({ difficulty: "easy" }).difficultyFocus).toBe("easier");
  });
});

describe("resolveRequestedCount", () => {
  it("uses plan max when unset", () => {
    expect(resolveRequestedCount({ authed: true, isPro: false }, {})).toBe(5);
  });
  it("caps to plan max and at least 3", () => {
    expect(resolveRequestedCount({ authed: true, isPro: true }, { question_count: 99 })).toBe(10);
    expect(resolveRequestedCount({ authed: true, isPro: false }, { question_count: 4 })).toBe(4);
  });
  it("accepts questionCount (camelCase)", () => {
    expect(resolveRequestedCount({ authed: true, isPro: true }, { questionCount: 7 })).toBe(7);
  });
});

describe("resolveSecondsPerQuestion", () => {
  it("resolves 0, 30, 45, 60, off", () => {
    expect(resolveSecondsPerQuestion(0)).toBe(0);
    expect(resolveSecondsPerQuestion("off")).toBe(0);
    expect(resolveSecondsPerQuestion(45)).toBe(45);
    expect(resolveSecondsPerQuestion(50)).toBe(60);
  });
});

describe("buildQuestionsResponsePack", () => {
  it("caps lists at 5 and questions at COUNT", () => {
    const parsed = {
      candidate_summary: "c",
      job_summary: "j",
      top_resume_signals: ["a", "b", "c", "d", "e", "f"],
      questions: Array.from({ length: 8 }, (_, i) => ({
        question: `Q${i}`,
        type: "t",
        reason: "r",
        targets: "",
        relevance_score: i,
      })),
    };
    const pack = buildQuestionsResponsePack(parsed, 3);
    expect(pack.top_resume_signals).toHaveLength(5);
    expect(pack.questions).toHaveLength(3);
    expect(pack.questions[0].question).toBe("Q0");
  });
  it("defaults type and relevance_score; drops empty questions", () => {
    const pack = buildQuestionsResponsePack(
      {
        questions: [
          { question: "Good", relevance_score: "nope" },
          { question: "", type: "x" },
        ],
      },
      10
    );
    expect(pack.questions).toHaveLength(1);
    expect(pack.questions[0].type).toBe("general");
    expect(pack.questions[0].relevance_score).toBe(5);
  });
});
