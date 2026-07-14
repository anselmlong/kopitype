"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ModeBar from "./ModeBar";
import WordStream from "./WordStream";
import Stats from "./Stats";
import {
  DEFAULT_MODE_ID,
  createStream,
  getMode,
  visibleModes,
  WordStream as Stream,
} from "@/lib/corpus";
import { computeResult, TestResult } from "@/lib/wpm";

const DURATIONS = [15, 30, 60];
const DEFAULT_DURATION = 30;
const EXTEND_WHEN_WITHIN = 12; // append more words when this close to the end

type Phase = "idle" | "running" | "finished";

/** Mutable model driven by keystrokes; kept in a ref to avoid stale closures. */
interface Model {
  words: string[];
  typed: string[]; // index-aligned with words
  idx: number; // current word
  buffer: string; // live text for the current word (mirrors the input value)
  correct: number; // correct keystrokes
  total: number; // all keystrokes (for raw wpm + accuracy)
}

function freshModel(stream: Stream): Model {
  const words = stream.next();
  return {
    words,
    typed: words.map(() => ""),
    idx: 0,
    buffer: "",
    correct: 0,
    total: 0,
  };
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

export default function TypingTest() {
  const [modeId, setModeId] = useState(DEFAULT_MODE_ID);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [uncensored, setUncensored] = useState(false);
  const [confirmVulgar, setConfirmVulgar] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [focused, setFocused] = useState(false);
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const [result, setResult] = useState<TestResult | null>(null);
  const [prevResult, setPrevResult] = useState<TestResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<Model | null>(null);
  const streamRef = useRef<Stream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const durationRef = useRef<number>(DEFAULT_DURATION);

  phaseRef.current = phase;
  durationRef.current = duration;

  const mode = useMemo(() => getMode(modeId), [modeId]);
  const modes = useMemo(() => visibleModes(uncensored), [uncensored]);

  // (Re)build the test whenever mode or duration changes.
  const reset = useCallback(() => {
    const stream = createStream(getMode(modeId));
    streamRef.current = stream;
    modelRef.current = freshModel(stream);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("idle");
    setTimeLeft(duration);
    setResult(null);
    rerender();
  }, [modeId, duration, rerender]);

  useEffect(() => {
    reset();
  }, [reset]);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const m = modelRef.current;
    const secs = durationRef.current;
    const res = m
      ? computeResult(m.correct, m.total, secs)
      : computeResult(0, 0, secs);
    // whatever was on screen before becomes the "previous" score
    setPrevResult(result);
    setResult(res);
    setPhase("finished");
    inputRef.current?.blur();
  }, [result]);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    setPhase("running");
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, durationRef.current - elapsed);
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 100);
  }, [finish]);

  /** Append more target words so the typist never runs out before time. */
  const maybeExtend = useCallback((m: Model) => {
    if (m.idx < m.words.length - EXTEND_WHEN_WITHIN) return;
    const more = streamRef.current?.next() ?? [];
    m.words = [...m.words, ...more];
    m.typed = [...m.typed, ...more.map(() => "")];
  }, []);

  const tally = useCallback(
    (m: Model, from: number, text: string, target: string) => {
      for (let k = from; k < text.length; k++) {
        m.total++;
        if (text[k] === target[k]) m.correct++;
      }
    },
    []
  );

  // Core input handler: the hidden input's value IS the current word buffer.
  // A space commits the word; backspace shrinks the buffer (so you can only
  // erase within the current word). This works with both physical and mobile
  // soft keyboards because it reads value changes, not keycodes.
  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const m = modelRef.current;
      if (!m || phaseRef.current === "finished") return;

      let value = e.target.value;
      if (phaseRef.current === "idle" && value.length > 0) startTimer();

      if (value.includes(" ")) {
        const idx = value.indexOf(" ");
        const committed = value.slice(0, idx);
        const remainder = value.slice(idx + 1);

        // count any chars typed into `committed` beyond the current buffer
        const cp = commonPrefix(m.buffer, committed);
        tally(m, cp, committed, m.words[m.idx] ?? "");

        if (committed.length === 0 && remainder.length === 0) {
          // stray leading space — ignore it
          e.target.value = "";
          m.buffer = "";
          rerender();
          return;
        }

        // commit the word and advance
        m.typed[m.idx] = committed;
        m.total++;
        m.correct++; // the separating space always counts as correct
        m.idx++;
        maybeExtend(m);

        // carry any characters typed after the space into the next word
        m.buffer = remainder;
        if (m.idx < m.words.length) {
          m.typed[m.idx] = remainder;
          tally(m, 0, remainder, m.words[m.idx] ?? "");
        }
        e.target.value = remainder;
        rerender();
        return;
      }

      // no space: normal typing / backspace within the current word
      const cp = commonPrefix(m.buffer, value);
      tally(m, cp, value, m.words[m.idx] ?? "");
      m.buffer = value;
      m.typed[m.idx] = value;
      rerender();
    },
    [startTimer, tally, maybeExtend, rerender]
  );

  const restart = useCallback(() => {
    reset();
    // focus after the reset paints
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [reset]);

  // Global keys: Tab always restarts (single keybind, monkeytype-style).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        restart();
        return;
      }
      // pressing any key while idle & unfocused starts by focusing the input
      if (
        phaseRef.current !== "finished" &&
        document.activeElement !== inputRef.current &&
        e.key.length === 1
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMode = (id: string) => {
    setModeId(id);
  };
  const handleDuration = (d: number) => {
    setDuration(d);
  };
  const handleToggleUncensored = () => {
    if (uncensored) {
      setUncensored(false);
      // if we were in the gated mode, drop back to the default
      if (getMode(modeId).gated) setModeId(DEFAULT_MODE_ID);
    } else {
      setConfirmVulgar(true);
    }
  };
  const confirmUncensored = () => {
    setUncensored(true);
    setConfirmVulgar(false);
  };

  const m = modelRef.current;
  const showHint = !focused && phase !== "finished";

  return (
    <div className="test">
      <ModeBar
        modes={modes}
        activeMode={modeId}
        onMode={handleMode}
        durations={DURATIONS}
        activeDuration={duration}
        onDuration={handleDuration}
        uncensored={uncensored}
        onToggleUncensored={handleToggleUncensored}
      />

      {confirmVulgar && (
        <div className="confirm" role="alertdialog">
          <span className="warn">you asked for it ah —</span>
          <span>uncensored mode has real hokkien vulgarities.</span>
          <button className="btn" onClick={confirmUncensored}>
            on lah
          </button>
          <button className="btn" onClick={() => setConfirmVulgar(false)}>
            nvm
          </button>
        </div>
      )}

      {phase !== "finished" && (
        <div className="timer" aria-live="off">
          {phase === "running" ? Math.ceil(timeLeft) : duration}
        </div>
      )}

      {phase === "finished" && result ? (
        <Stats result={result} previous={prevResult} onRestart={restart} />
      ) : (
        <div
          className="test-area"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            className="capture"
            type="text"
            value={m?.buffer ?? ""}
            onChange={onInputChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="typing input"
          />
          <WordStream
            words={m?.words ?? []}
            typed={m?.typed ?? []}
            wordIndex={m?.idx ?? 0}
            blurred={showHint}
            typing={phase === "running"}
          />
          {showHint && (
            <div className="focus-hint">
              click here or press any key to start
            </div>
          )}
        </div>
      )}
    </div>
  );
}
