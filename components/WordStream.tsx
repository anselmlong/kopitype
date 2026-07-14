"use client";

import { useLayoutEffect, useRef, useState, Fragment } from "react";

interface WordStreamProps {
  /** Target words for the test. */
  words: string[];
  /** What the user has typed for each word (index-aligned with `words`). */
  typed: string[];
  /** Index of the word currently being typed. */
  wordIndex: number;
  /** Blur the text when the input isn't focused. */
  blurred: boolean;
  /** Hide caret blink while actively typing. */
  typing: boolean;
}

const MAX_EXTRA = 10;

/** Split a single word into per-character spans with correct/incorrect/pending/extra state. */
function renderWord(word: string, typed: string, isActive: boolean) {
  const nodes: React.ReactNode[] = [];
  const extraCount = Math.min(Math.max(typed.length - word.length, 0), MAX_EXTRA);
  const total = word.length + extraCount;

  for (let j = 0; j < total; j++) {
    if (isActive && j === typed.length) {
      nodes.push(<span key={`caret-${j}`} className="caret" />);
    }

    if (j < word.length) {
      let cls = "pending";
      if (j < typed.length) cls = typed[j] === word[j] ? "correct" : "incorrect";
      nodes.push(
        <span key={j} className={`char ${cls}`}>
          {word[j]}
        </span>
      );
    } else {
      // extra characters the typist added beyond the word length
      nodes.push(
        <span key={j} className="char extra">
          {typed[j]}
        </span>
      );
    }
  }

  // caret sitting at the very end of the word (nothing left to type)
  if (isActive && typed.length >= total) {
    nodes.push(<span key="caret-end" className="caret" />);
  }

  return nodes;
}

export default function WordStream({
  words,
  typed,
  wordIndex,
  blurred,
  typing,
}: WordStreamProps) {
  const activeRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Keep the active word near the top: scroll the inner wrapper up as the
  // typist descends the lines, so upcoming words are always visible below.
  useLayoutEffect(() => {
    const active = activeRef.current;
    if (!active) return;
    const lineHeight = active.offsetHeight || 0;
    const top = active.offsetTop;
    // once past the first line, keep the active line pinned as the top line
    setOffset(Math.max(0, top - lineHeight));
  }, [wordIndex, words]);

  return (
    <div className={`wordstream${blurred ? " blurred" : ""}${typing ? " typing" : ""}`}>
      <div
        ref={innerRef}
        className="wordstream-inner"
        style={{ transform: `translateY(-${offset}px)` }}
      >
        {words.map((word, i) => (
          <Fragment key={i}>
            <span
              ref={i === wordIndex ? activeRef : null}
              className={`word${i === wordIndex ? " active" : ""}`}
            >
              {renderWord(word, typed[i] ?? "", i === wordIndex)}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
