import { describe, it, expect } from "vitest";
import {
  FREE_MONTHLY_INTERVIEW_LIMIT,
  FREE_QUESTION_COUNT,
  PRO_QUESTION_COUNT,
} from "../api/_lib/candidateAuth.js";

describe("candidateAuth tier constants", () => {
  it("matches documented free tier limits", () => {
    expect(FREE_MONTHLY_INTERVIEW_LIMIT).toBe(3);
    expect(FREE_QUESTION_COUNT).toBe(5);
    expect(PRO_QUESTION_COUNT).toBe(10);
  });
});
