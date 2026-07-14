/**
 * Corpus loading + mode registry.
 *
 * Adding a new mode is deliberately trivial:
 *   1. Drop a JSON file in /data
 *   2. Add one entry to the MODES array below
 * That's the whole extensibility story (kopi mode, hawker mode, NS ranks, ...).
 *
 * Two corpus shapes are supported:
 *   - "words":  string[]                     (single tokens, shuffled)
 *   - "quotes": { text, source }[]           (whole phrases, picked one at a time)
 */

import words from "../data/words.json";
import quotes from "../data/quotes.json";
import vulgar from "../data/vulgar.json";
import mrt from "../data/mrt.json";
import xmm from "../data/xmm.json";

export type ModeType = "words" | "quotes";

export interface Quote {
  text: string;
  source: string;
}

export interface ModeDef {
  id: string;
  label: string;
  type: ModeType;
  /** Populated for type === "words". */
  words?: string[];
  /** Populated for type === "quotes". */
  quotes?: Quote[];
  /** If true, hidden from the default mode bar until the "uncensored" toggle. */
  gated?: boolean;
}

/**
 * The one array that defines every mode. To add "kopi mode" later:
 *   import kopi from "../data/kopi.json";
 *   { id: "kopi", label: "kopi", type: "words", words: kopi }
 */
export const MODES: ModeDef[] = [
  { id: "words", label: "words", type: "words", words: words as string[] },
  { id: "quote", label: "quote", type: "quotes", quotes: quotes as Quote[] },
  { id: "mrt", label: "mrt", type: "quotes", quotes: mrt as Quote[] },
  { id: "xmm", label: "xmm", type: "quotes", quotes: xmm as Quote[] },
  {
    id: "vulgar",
    label: "uncensored",
    type: "words",
    words: vulgar as string[],
    gated: true,
  },
];

export const DEFAULT_MODE_ID = "words";

export function getMode(id: string): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

/** Modes shown in the bar. Gated modes only appear when uncensored is on. */
export function visibleModes(uncensored: boolean): ModeDef[] {
  return MODES.filter((m) => !m.gated || uncensored);
}

/** Fisher–Yates shuffle, returns a new array. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WORD_BATCH = 60;

/**
 * A stream of target words for a test. `next()` yields the next batch:
 *   - words mode:  a fresh shuffle of ~60 tokens
 *   - quote mode:  the words of one random quote, plus its source attribution
 * The test starts with one batch and appends more via next() as the typist
 * nears the end, so it never runs out before the timer does.
 */
export interface Batch {
  words: string[];
  /** Attribution for quote batches ("kopi order", "mrt gripes", ...). */
  source?: string;
}

export interface WordStream {
  next: () => Batch;
}

export function createStream(mode: ModeDef): WordStream {
  if (mode.type === "quotes") {
    const pool = mode.quotes ?? [];
    return {
      next: () => {
        if (!pool.length) return { words: [] };
        const q = pick(pool);
        return { words: q.text.split(/\s+/), source: q.source };
      },
    };
  }
  const pool = mode.words ?? [];
  return {
    next: () => ({ words: shuffle(pool).slice(0, WORD_BATCH) }),
  };
}
