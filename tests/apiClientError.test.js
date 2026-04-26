import { describe, it, expect } from "vitest";
import { messageForFailedApiResponse } from "../src/apiClientError.js";

function mockRes(status, statusText = "") {
  return { status, statusText };
}

describe("messageForFailedApiResponse", () => {
  it("returns server error string when present", () => {
    const msg = messageForFailedApiResponse(mockRes(400, "Bad Request"), { error: "Bad input" });
    expect(msg).toBe("Bad input");
  });

  it("detects stale local API 404 with path", () => {
    const msg = messageForFailedApiResponse(mockRes(404), {
      error: "Not found",
      path: "/api/foo",
    });
    expect(msg).toContain("8787");
    expect(msg).toContain("/api/foo");
  });

  it("detects Vite-only dev missing /api", () => {
    const msg = messageForFailedApiResponse(mockRes(404, "Not Found"), { error: "not found" });
    expect(msg).toContain("dev:vite");
    expect(msg).toContain("/api");
  });

  it("falls back when no useful error", () => {
    const msg = messageForFailedApiResponse(mockRes(500, ""), {});
    expect(msg).toBe("Request failed. Please try again.");
  });
});
