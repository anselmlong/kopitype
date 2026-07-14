"use client";

import { useLayoutEffect, useRef, useState } from "react";

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
function renderWord(word: string, typed: string) {
  const nodes: React.ReactNode[] = [];
  const extraCount = Math.min(Math.max(typed.length - word.length, 0), MAX_EXTRA);
  const total = word.length + extraCount;

  for (let j = 0; j < total; j++) {
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
  const [caret, setCaret] = useState<{ x: number; y: number; h: number } | null>(
    null
  );

  // Keep the active word near the top: scroll the inner wrapper up as the
  // typist descends the lines, so upcoming words are always visible below.
  // Also position the caret: one absolutely-positioned element that glides
  // (via CSS transform transition) instead of a span that teleports.
  //
  // No dependency array: `typed` is mutated in place by the model, so its
  // identity never changes and deps would skip per-keystroke re-measurement.
  // The parent re-renders on every keystroke; measuring is cheap. The setters
  // bail out (return the same value) when nothing moved, so this cannot loop.
  useLayoutEffect(() => {
    const active = activeRef.current;
    if (!active) return;
    const lineHeight = active.offsetHeight || 0;
    const top = active.offsetTop;
    // once past the first line, keep the active line pinned as the top line
    setOffset(Math.max(0, top - lineHeight));

    const chars = active.children;
    const typedLen = (typed[wordIndex] ?? "").length;
    if (chars.length === 0) return;
    const before = Math.min(typedLen, chars.length - 1);
    const el = chars[before] as HTMLElement;
    // caret sits before the char at the buffer position, or after the last
    // char when the whole word (plus extras) has been typed
    const past = typedLen >= chars.length;
    const x = el.offsetLeft + (past ? el.offsetWidth : 0);
    const y = el.offsetTop;
    const h = el.offsetHeight;
    setCaret((prev) =>
      prev && prev.x === x && prev.y === y && prev.h === h
        ? prev
        : { x, y, h }
    );
  });

  return (
    <div className={`wordstream${blurred ? " blurred" : ""}${typing ? " typing" : ""}`}>
      <div
        ref={innerRef}
        className="wordstream-inner"
        style={{ transform: `translateY(-${offset}px)` }}
      >
        {caret && (
          <span
            className="caret"
            style={{
              transform: `translate(${caret.x}px, ${caret.y}px)`,
              height: caret.h,
            }}
          />
        )}
        {words.map((word, i) => (
          <span
            key={i}
            ref={i === wordIndex ? activeRef : null}
            className={`word${i === wordIndex ? " active" : ""}`}
          >
            {renderWord(word, typed[i] ?? "")}
          </span>
        ))}
      </div>
    </div>
  );
}
