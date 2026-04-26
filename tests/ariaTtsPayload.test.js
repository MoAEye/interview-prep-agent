import { describe, it, expect } from "vitest";
import { classifyAudioResponsePrefix, isLikelyBadTtsPayload } from "../src/ariaTtsPayload.js";

describe("classifyAudioResponsePrefix", () => {
  it("detects ID3 tag", () => {
    const u8 = new Uint8Array([0x49, 0x44, 0x33, 0x00]);
    expect(classifyAudioResponsePrefix(u8).looksMpeg).toBe(true);
    expect(classifyAudioResponsePrefix(u8).looksJson).toBe(false);
  });

  it("detects MPEG frame sync", () => {
    const u8 = new Uint8Array([0xff, 0xe0, 0x00, 0x00]);
    expect(classifyAudioResponsePrefix(u8).looksMpeg).toBe(true);
  });

  it("detects JSON and HTML", () => {
    expect(classifyAudioResponsePrefix(new Uint8Array([0x7b, 0x22, 0x65, 0x72])).looksJson).toBe(true);
    expect(classifyAudioResponsePrefix(new Uint8Array([0x3c, 0x21, 0x44, 0x4f])).looksHtml).toBe(true);
  });

  it("handles short buffers", () => {
    const out = classifyAudioResponsePrefix(new Uint8Array([0xff]));
    expect(out.looksMpeg).toBe(false);
  });

  it("accepts ArrayBuffer", () => {
    const buf = new Uint8Array([0x7b, 0, 0, 0]).buffer;
    expect(classifyAudioResponsePrefix(buf).looksJson).toBe(true);
  });
});

describe("isLikelyBadTtsPayload", () => {
  it("flags JSON/HTML", () => {
    expect(isLikelyBadTtsPayload({ looksMpeg: false, looksJson: true, looksHtml: false }, false)).toBe(true);
    expect(isLikelyBadTtsPayload({ looksMpeg: false, looksJson: false, looksHtml: true }, false)).toBe(true);
  });

  it("allows MPEG without Content-Type hint", () => {
    expect(isLikelyBadTtsPayload({ looksMpeg: true, looksJson: false, looksHtml: false }, false)).toBe(false);
  });

  it("allows ambiguous bytes if server declared audio", () => {
    expect(isLikelyBadTtsPayload({ looksMpeg: false, looksJson: false, looksHtml: false }, true)).toBe(false);
  });
});
