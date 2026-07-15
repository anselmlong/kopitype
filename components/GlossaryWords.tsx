"use client";

import { useCallback } from "react";
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
  // keep a tooltip on-screen: chips near the right edge would otherwise
  // clip their meaning off the viewport (visibility:hidden still has a box,
  // so we can measure before it shows)
  const clampTip = useCallback(
    (e: React.SyntheticEvent<HTMLLIElement>) => {
      const tip = e.currentTarget.querySelector<HTMLElement>(".gloss-tip");
      if (!tip) return;
      tip.style.transform = "";
      const r = tip.getBoundingClientRect();
      const overflow = r.right - (window.innerWidth - 12);
      if (overflow > 0) tip.style.transform = `translateX(-${overflow}px)`;
    },
    []
  );

  const unique = uniqueWords(words);
  if (unique.length === 0) return null;
  const known = unique.filter((w) => lookupGlossary(w) !== null);

  return (
    <div className="gloss">
      <div className="gloss-head">
        <span className="gloss-title">the singlish you typed</span>
        {known.length > 0 && (
          <span className="gloss-note">
            <span className="hint-pointer">
              hover for the meaning · click to read the entry
            </span>
            <span className="hint-touch">tap a word to read the entry</span>
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
            <li
              key={w}
              className="gloss-item"
              onMouseEnter={clampTip}
              onFocus={clampTip}
            >
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
