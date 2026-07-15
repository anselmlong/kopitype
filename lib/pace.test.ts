import { describe, expect, it } from "vitest";
import { niceMax, paceSeries, timeTickStep } from "./pace";

describe("paceSeries", () => {
  it("computes running net wpm at each sample", () => {
    // 25 correct chars in 60s = (25/5)/1min = 5 wpm
    const pts = paceSeries([
      { t: 30, correct: 25, total: 25 },
      { t: 60, correct: 25, total: 25 },
    ]);
    expect(pts).toHaveLength(2);
    expect(pts[0].wpm).toBeCloseTo(10);
    expect(pts[1].wpm).toBeCloseTo(5);
  });

  it("reports per-interval errors from cumulative tallies", () => {
    const pts = paceSeries([
      { t: 1, correct: 5, total: 5 }, // clean second
      { t: 2, correct: 8, total: 10 }, // 2 wrong keys here
      { t: 3, correct: 12, total: 14 }, // clean second
    ]);
    expect(pts.map((p) => p.errors)).toEqual([0, 2, 0]);
  });

  it("drops t<=0 samples and collapses duplicate timestamps", () => {
    const pts = paceSeries([
      { t: 0, correct: 0, total: 0 },
      { t: 1, correct: 4, total: 4 },
      { t: 1, correct: 6, total: 6 },
      { t: 2, correct: 10, total: 10 },
    ]);
    expect(pts.map((p) => p.t)).toEqual([1, 2]);
    expect(pts[0].wpm).toBeCloseTo((6 / 5) * 60);
  });

  it("handles an empty run", () => {
    expect(paceSeries([])).toEqual([]);
  });
});

describe("niceMax", () => {
  it("lands on clean tick steps", () => {
    expect(niceMax(37)).toEqual({ max: 40, step: 10 });
    expect(niceMax(61)).toEqual({ max: 80, step: 20 });
    expect(niceMax(3)).toEqual({ max: 5, step: 5 });
  });

  it("never returns zero for tiny inputs", () => {
    expect(niceMax(0).max).toBeGreaterThan(0);
  });
});

describe("timeTickStep", () => {
  it("keeps tick counts sane per duration", () => {
    expect(timeTickStep(15)).toBe(5);
    expect(timeTickStep(30)).toBe(10);
    expect(timeTickStep(60)).toBe(15);
    expect(timeTickStep(300)).toBe(30);
  });
});
