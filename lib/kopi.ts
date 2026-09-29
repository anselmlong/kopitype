/**
 * The results verdict, in the one unit every kopitiam agrees on: how thick
 * the kopi is. Faster runs pour a stronger cup — po (diluted) up to di lo
 * (undiluted). Purely cosmetic; no effect on scores or records.
 */

export interface KopiVerdict {
  /** The order, e.g. "kopi gau". */
  cup: string;
  /** What the uncle says about it. */
  remark: string;
}

const TIERS: { min: number; cup: string; remark: string }[] = [
  { min: 100, cup: "kopi di lo", remark: "no water added. uncle salute you" },
  { min: 70, cup: "kopi gau gau", remark: "power lah" },
  { min: 45, cup: "kopi gau", remark: "strong sia" },
  { min: 25, cup: "kopi", remark: "steady lah" },
  { min: 1, cup: "kopi po", remark: "a bit diluted. one more round?" },
];

/** Verdict for a finished run's wpm, or null when nothing was typed. */
export function kopiVerdict(wpm: number): KopiVerdict | null {
  const tier = TIERS.find((t) => wpm >= t.min);
  return tier ? { cup: tier.cup, remark: tier.remark } : null;
}
