/**
 * The Singlish glossary: word -> short meaning, plus a click-through link so
 * the results screen doubles as a tiny language lesson.
 *
 * Entries live in data/glossary.json (hand-written, one entry per term).
 * An entry may carry an explicit `link` (usually Wikipedia, for institutions
 * like hdb or paynow); everything else falls back to a Wiktionary search,
 * which lands straight on the entry when one exists.
 */

import glossary from "../data/glossary.json";

export interface GlossaryEntry {
  meaning: string;
  link?: string;
}

const ENTRIES = glossary as Record<string, GlossaryEntry>;

export function lookupGlossary(word: string): GlossaryEntry | null {
  return ENTRIES[word.toLowerCase()] ?? null;
}

/** Where "read more" goes: the entry's own link, or a Wiktionary search. */
export function glossaryLink(word: string, entry: GlossaryEntry): string {
  return (
    entry.link ??
    `https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(word)}`
  );
}

/** Unique words in first-seen order, for the "words you typed" recap. */
export function uniqueWords(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (!w || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}
