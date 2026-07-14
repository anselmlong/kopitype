/**
 * WPM + accuracy math. Pure functions, no React, unit-tested in wpm.test.ts.
 *
 * All three headline numbers derive from three tallies collected while typing:
 *   - correctChars: printable keystrokes that matched the expected character
 *   - typedChars:   every printable keystroke (correct, wrong, or extra)
 *   - seconds:      how long the test ran
 *
 * We use the standard typing-test convention where a "word" is 5 characters,
 * so wpm = (chars / 5) / minutes.
 */

const CHARS_PER_WORD = 5;

function minutes(seconds: number): number {
  return seconds / 60;
}

/** Net wpm: correctly typed characters only. This is the headline number. */
export function grossWpm(correctChars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (correctChars / CHARS_PER_WORD) / minutes(seconds);
}

/** Raw wpm: every keystroke counts, right or wrong. */
export function rawWpm(typedChars: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return (typedChars / CHARS_PER_WORD) / minutes(seconds);
}

/** Accuracy as a percentage: correct keystrokes over total keystrokes. */
export function accuracy(correctChars: number, typedChars: number): number {
  if (typedChars <= 0) return 0;
  return (correctChars / typedChars) * 100;
}

/** Round for display. wpm to whole numbers, accuracy to whole percent. */
export function round(n: number): number {
  return Math.round(n);
}

export interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  typedChars: number;
  seconds: number;
}

/** Bundle the tallies into the numbers the end screen shows. */
export function computeResult(
  correctChars: number,
  typedChars: number,
  seconds: number
): TestResult {
  return {
    wpm: round(grossWpm(correctChars, seconds)),
    rawWpm: round(rawWpm(typedChars, seconds)),
    accuracy: round(accuracy(correctChars, typedChars)),
    correctChars,
    typedChars,
    seconds,
  };
}
