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

/**
 * Verdict for a finished run's wpm, or null when nothing was typed. A run
 * without a single wrong keystroke is ordered "kosong" — nothing added.
 */
export function kopiVerdict(wpm: number, clean = false): KopiVerdict | null {
  const tier = TIERS.find((t) => wpm >= t.min);
  if (!tier) return null;
  if (clean) return { cup: `${tier.cup} kosong`, remark: "nothing added, not one wrong key" };
  return { cup: tier.cup, remark: tier.remark };
}
