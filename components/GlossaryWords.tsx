"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [tip, setTip] = useState<{
    word: string;
    meaning: string;
    left: number;
    top: number;
  } | null>(null);
  const unique = uniqueWords(words);
  if (unique.length === 0) return null;
  const known = unique.filter((w) => lookupGlossary(w) !== null);

  const showTip = (
    event: React.MouseEvent<HTMLAnchorElement> | React.FocusEvent<HTMLAnchorElement>,
    word: string,
    meaning: string
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const halfWidth = Math.min(136, (window.innerWidth - 24) / 2);
    setTip({
      word,
      meaning,
      left: Math.max(halfWidth + 12, Math.min(rect.left + rect.width / 2, window.innerWidth - halfWidth - 12)),
      top: rect.top - 8,
    });
  };

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
                aria-describedby={tip?.word === w ? "glossary-tooltip" : undefined}
                onMouseEnter={(event) => showTip(event, w, entry.meaning)}
                onMouseLeave={() => setTip(null)}
                onFocus={(event) => showTip(event, w, entry.meaning)}
                onBlur={() => setTip(null)}
              >
                {w}
              </a>
            </li>
          );
        })}
      </ul>
      {tip &&
        createPortal(
          <span
            id="glossary-tooltip"
            className="gloss-tip visible"
            role="tooltip"
            style={{ left: tip.left, top: tip.top }}
          >
            {tip.meaning}
          </span>,
          document.body
        )}
    </div>
  );
}
