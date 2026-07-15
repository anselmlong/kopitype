/**
 * Pace-over-time math for the end-of-test graph. Pure functions, unit-tested.
 *
 * While a test runs we snapshot the keystroke tallies roughly once a second:
 *   { t: seconds elapsed, correct: cumulative correct keystrokes, total: all }
 * plus one final snapshot at the exact finish time. This module turns those
 * cumulative samples into per-second chart points.
 */

export interface PaceSample {
  /** Seconds since the test started (monotonically increasing). */
  t: number;
  /** Cumulative correct keystrokes at time t. */
  correct: number;
  /** Cumulative keystrokes (correct or not) at time t. */
  total: number;
}

export interface PacePoint {
  t: number;
  /** Running net wpm at time t: (correct chars / 5) / minutes elapsed. */
  wpm: number;
  /** Wrong keystrokes struck since the previous sample. */
  errors: number;
}

const CHARS_PER_WORD = 5;

/**
 * Convert cumulative samples into chart points. Samples at t <= 0 or out of
 * order are dropped; duplicate timestamps keep the later tallies.
 */
export function paceSeries(samples: readonly PaceSample[]): PacePoint[] {
  const clean: PaceSample[] = [];
  for (const s of samples) {
    if (s.t <= 0) continue;
    const last = clean[clean.length - 1];
    if (last && s.t <= last.t) {
      clean[clean.length - 1] = s;
    } else {
      clean.push(s);
    }
  }

  let prevWrong = 0;
  return clean.map((s) => {
    const wrong = s.total - s.correct;
    const point: PacePoint = {
      t: s.t,
      wpm: (s.correct / CHARS_PER_WORD) / (s.t / 60),
      errors: Math.max(0, wrong - prevWrong),
    };
    prevWrong = wrong;
    return point;
  });
}

/** A rounded-up axis maximum that lands on a clean tick step. */
export function niceMax(maxValue: number): { max: number; step: number } {
  const target = Math.max(maxValue, 1);
  for (const step of [5, 10, 20, 25, 50, 100, 200]) {
    if (target <= step * 4) {
      return { max: Math.max(step, Math.ceil(target / step) * step), step };
    }
  }
  const step = Math.ceil(target / 4 / 100) * 100;
  return { max: Math.ceil(target / step) * step, step };
}

/** X-axis tick spacing in seconds for a test of the given length. */
export function timeTickStep(totalSeconds: number): number {
  if (totalSeconds <= 20) return 5;
  if (totalSeconds <= 45) return 10;
  if (totalSeconds <= 90) return 15;
  return 30;
}
