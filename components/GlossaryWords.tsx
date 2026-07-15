"use client";

import { glossaryLink, lookupGlossary, uniqueWords } from "@/lib/glossary";

interface GlossaryWordsProps {
  /** Target words the typist attempted this run, in order. */
  words: string[];
}

/**
 * The learn-the-lingo recap: every word from the run, once. Words with a
 * glossary entry are chips — hover (or focus) shows the meaning, clicking
 * opens the dictionary entry (Wiktionary / Wikipedia) in a new tab. Words
 * we can't gloss render muted and inert.
 */
export default function GlossaryWords({ words }: GlossaryWordsProps) {
  const unique = uniqueWords(words);
  if (unique.length === 0) return null;
  const known = unique.filter((w) => lookupGlossary(w) !== null);

  return (
    <div className="gloss">
      <div className="gloss-head">
        <span className="gloss-title">the singlish you typed</span>
        {known.length > 0 && (
          <span className="gloss-note">
            hover for the meaning · click to read the entry
          </span>
        )}
      </div>
      <ul className="gloss-words">
        {unique.map((w) => {
          const entry = lookupGlossary(w);
          if (!entry) {
            return (
              <li key={w} className="gloss-plain">
                {w}
              </li>
            );
          }
          return (
            <li key={w} className="gloss-item">
              <a
                className="gloss-chip"
                href={glossaryLink(w, entry)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${w}: ${entry.meaning} (opens dictionary entry)`}
              >
                {w}
              </a>
              <span className="gloss-tip" role="tooltip" aria-hidden>
                {entry.meaning}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
