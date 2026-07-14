import { describe, it, expect } from "vitest";
import {
  grossWpm,
  rawWpm,
  accuracy,
  computeResult,
} from "./wpm";

describe("grossWpm", () => {
  it("known char count over a full minute", () => {
    // 250 correct chars / 5 = 50 words, over 1 minute => 50 wpm
    expect(grossWpm(250, 60)).toBe(50);
  });

  it("scales with duration: same chars in 30s is double wpm", () => {
    // 125 chars / 5 = 25 words in 0.5 min => 50 wpm
    expect(grossWpm(125, 30)).toBe(50);
  });

  it("zero-input case returns 0", () => {
    expect(grossWpm(0, 30)).toBe(0);
  });

  it("guards against zero/negative duration", () => {
    expect(grossWpm(100, 0)).toBe(0);
    expect(grossWpm(100, -5)).toBe(0);
  });
});

describe("rawWpm", () => {
  it("counts every keystroke, right or wrong", () => {
    // 300 total chars / 5 = 60 words in 1 min => 60 wpm
    expect(rawWpm(300, 60)).toBe(60);
  });

  it("zero-input case returns 0", () => {
    expect(rawWpm(0, 60)).toBe(0);
  });
});

describe("accuracy", () => {
  it("perfect typing is 100%", () => {
    expect(accuracy(50, 50)).toBe(100);
  });

  it("accuracy with errors", () => {
    // 45 correct out of 50 keystrokes => 90%
    expect(accuracy(45, 50)).toBe(90);
  });

  it("zero-input case returns 0 (no divide-by-zero)", () => {
    expect(accuracy(0, 0)).toBe(0);
  });
});

describe("computeResult", () => {
  it("bundles and rounds the headline numbers", () => {
    // 275 correct of 300 typed over 60s
    // wpm = 55, raw = 60, acc = round(91.66) = 92
    const r = computeResult(275, 300, 60);
    expect(r.wpm).toBe(55);
    expect(r.rawWpm).toBe(60);
    expect(r.accuracy).toBe(92);
    expect(r.correctChars).toBe(275);
    expect(r.typedChars).toBe(300);
    expect(r.seconds).toBe(60);
  });

  it("handles the zero-input result cleanly", () => {
    const r = computeResult(0, 0, 30);
    expect(r.wpm).toBe(0);
    expect(r.rawWpm).toBe(0);
    expect(r.accuracy).toBe(0);
  });
});
