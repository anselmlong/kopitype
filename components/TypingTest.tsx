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
import ChallengePanel from "./ChallengePanel";
import SubmitPanel from "./SubmitPanel";
import {
  DEFAULT_MODE_ID,
  createStream,
  getMode,
  visibleModes,
  WordStream as Stream,
} from "@/lib/corpus";
import { computeResult, TestResult } from "@/lib/wpm";
import { getPersonalBest, savePersonalBest, PersonalBest } from "@/lib/records";
import { Challenge, challengeFromHash } from "@/lib/challenge";
import { PacePoint, PaceSample, paceSeries } from "@/lib/pace";
import {
  playTick,
  playError,
  playFinish,
  playPersonalBest,
  loadSoundPref,
  saveSoundPref,
} from "@/lib/sound";

const DURATIONS = [15, 30, 60];
const DEFAULT_DURATION = 30;
const EXTEND_WHEN_WITHIN = 12; // append more words when this close to the end

type Phase = "idle" | "running" | "finished";
type Panel = "none" | "challenge" | "submit";

/** Mutable model driven by keystrokes; kept in a ref to avoid stale closures. */
interface Model {
  words: string[];
  typed: string[]; // index-aligned with words
  idx: number; // current word
  buffer: string; // live text for the current word (mirrors the input value)
  correct: number; // correct keystrokes
  total: number; // all keystrokes (for raw wpm + accuracy)
  sources: { start: number; source: string }[]; // quote attributions by word range
}

function freshModel(stream: Stream): Model {
  // pull batches until the opening view isn't sparse — short quote batches
  // (an mrt station is 1-4 words) would otherwise start almost empty
  const words: string[] = [];
  const sources: { start: number; source: string }[] = [];
  for (let i = 0; i < 10 && words.length < EXTEND_WHEN_WITHIN; i++) {
    const batch = stream.next();
    if (batch.words.length === 0) break;
    if (batch.source) sources.push({ start: words.length, source: batch.source });
    words.push(...batch.words);
  }
  return {
    words,
    typed: words.map(() => ""),
    idx: 0,
    buffer: "",
    correct: 0,
    total: 0,
    sources,
  };
}

/** A challenge is one fixed phrase: a single-batch model, nothing appended. */
function challengeModel(c: Challenge): Model {
  const words = c.text.split(/\s+/);
  return {
    words,
    typed: words.map(() => ""),
    idx: 0,
    buffer: "",
    correct: 0,
    total: 0,
    sources: [{ start: 0, source: c.by ? `challenge by ${c.by}` : "custom challenge" }],
  };
}

/** The whole phrase has been typed (last word committed, or fully entered). */
function challengeDone(m: Model): boolean {
  if (m.idx >= m.words.length) return true;
  return m.idx === m.words.length - 1 && m.buffer === m.words[m.idx];
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/** Attribution for the quote the typist is currently inside, if any. */
function currentSource(m: Model): string | null {
  let src: string | null = null;
  for (const s of m.sources) {
    if (s.start > m.idx) break;
    src = s.source;
  }
  return src;
}

export default function TypingTest() {
  const [modeId, setModeId] = useState(DEFAULT_MODE_ID);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [uncensored, setUncensored] = useState(false);
  const [confirmVulgar, setConfirmVulgar] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [panel, setPanel] = useState<Panel>("none");
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [focused, setFocused] = useState(false);
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const [result, setResult] = useState<TestResult | null>(null);
  const [prevResult, setPrevResult] = useState<TestResult | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [pace, setPace] = useState<PacePoint[]>([]);
  const [attempted, setAttempted] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<Model | null>(null);
  const streamRef = useRef<Stream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  const durationRef = useRef<number>(DEFAULT_DURATION);
  const modeIdRef = useRef<string>(DEFAULT_MODE_ID);
  const soundRef = useRef<boolean>(true);
  const challengeRef = useRef<Challenge | null>(null);
  // per-second tallies for the pace-over-time graph
  const samplesRef = useRef<PaceSample[]>([]);
  const lastSampleSecRef = useRef<number>(0);
  // survives reset() (which nulls `result`), so "prev" still shows next run
  const lastResultRef = useRef<TestResult | null>(null);

  phaseRef.current = phase;
  durationRef.current = duration;
  modeIdRef.current = modeId;
  soundRef.current = soundOn;
  challengeRef.current = challenge;
  const panelRef = useRef<Panel>("none");
  panelRef.current = panel;

  const mode = useMemo(() => getMode(modeId), [modeId]);
  const modes = useMemo(() => visibleModes(uncensored), [uncensored]);

  // sound preference lives in localStorage; read after mount to keep SSR stable
  useEffect(() => {
    setSoundOn(loadSoundPref());
  }, []);

  // Challenge links arrive in the URL fragment (#c=...): read it on mount and
  // whenever the hash changes (someone pastes a new link, or "try it now").
  useEffect(() => {
    const readHash = () => {
      const c = challengeFromHash(window.location.hash);
      setChallenge(c);
      if (c) setPanel("none"); // an arriving challenge takes the stage
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  // (Re)build the test whenever mode, duration, or the active challenge changes.
  const reset = useCallback(() => {
    if (challenge) {
      // fixed phrase: one batch, nothing appended, timer counts up
      streamRef.current = { next: () => ({ words: [] }) };
      modelRef.current = challengeModel(challenge);
    } else {
      const stream = createStream(getMode(modeId));
      streamRef.current = stream;
      modelRef.current = freshModel(stream);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    samplesRef.current = [];
    lastSampleSecRef.current = 0;
    setPhase("idle");
    setTimeLeft(challenge ? 0 : duration);
    setResult(null);
    setIsNewBest(false);
    rerender();
  }, [modeId, duration, challenge, rerender]);

  useEffect(() => {
    reset();
  }, [reset]);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const m = modelRef.current;
    const isChallenge = challengeRef.current !== null;
    // a challenge runs until the phrase is done, so its "duration" is elapsed
    const secs = isChallenge
      ? Math.max((Date.now() - startRef.current) / 1000, 0.1)
      : durationRef.current;
    const res = m
      ? computeResult(m.correct, m.total, secs)
      : computeResult(0, 0, secs);

    // close the pace series with an exact-final sample, then bake the graph
    if (m) {
      samplesRef.current = [
        ...samplesRef.current,
        { t: secs, correct: m.correct, total: m.total },
      ];
    }
    setPace(paceSeries(samplesRef.current));
    setAttempted(
      m ? m.words.slice(0, m.idx + (m.buffer.length > 0 ? 1 : 0)) : []
    );

    // personal best bookkeeping (per mode + duration; challenges don't count)
    const pb = isChallenge ? null : getPersonalBest(modeIdRef.current, secs);
    const beatIt =
      !isChallenge && res.wpm > 0 && (!pb || res.wpm > pb.wpm);
    if (beatIt) {
      savePersonalBest(modeIdRef.current, secs, {
        wpm: res.wpm,
        accuracy: res.accuracy,
        ts: Date.now(),
      });
    }
    setPersonalBest(pb);
    setIsNewBest(beatIt);
    if (soundRef.current) (beatIt ? playPersonalBest : playFinish)();

    // the last finished test becomes the "previous" score
    setPrevResult(lastResultRef.current);
    lastResultRef.current = res;
    setResult(res);
    setPhase("finished");
    inputRef.current?.blur();
  }, []);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    setPhase("running");
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;

      // snapshot the tallies once a second for the pace graph
      const sec = Math.floor(elapsed);
      const m = modelRef.current;
      if (m && sec > lastSampleSecRef.current) {
        lastSampleSecRef.current = sec;
        samplesRef.current = [
          ...samplesRef.current,
          { t: sec, correct: m.correct, total: m.total },
        ];
      }

      if (challengeRef.current) {
        // challenges count up and end when the phrase does, not on a timer
        setTimeLeft(elapsed);
        return;
      }
      const left = Math.max(0, durationRef.current - elapsed);
      setTimeLeft(left);
      if (left <= 0) finish();
    }, 100);
  }, [finish]);

  /** Append more target words so the typist never runs out before time. */
  const maybeExtend = useCallback((m: Model) => {
    if (m.idx < m.words.length - EXTEND_WHEN_WITHIN) return;
    const batch = streamRef.current?.next();
    if (!batch) return;
    if (batch.source) {
      m.sources = [...m.sources, { start: m.words.length, source: batch.source }];
    }
    m.words = [...m.words, ...batch.words];
    m.typed = [...m.typed, ...batch.words.map(() => "")];
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
      // a stray space shouldn't arm the timer — only a real character starts
      if (phaseRef.current === "idle" && value.trim().length > 0) startTimer();

      const beforeCorrect = m.correct;
      const beforeTotal = m.total;

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

        // commit the word and advance; the separating space is only a
        // correct keystroke when the committed word actually matched
        m.typed[m.idx] = committed;
        m.total++;
        if (committed === (m.words[m.idx] ?? "")) m.correct++;
        m.idx++;
        maybeExtend(m);

        // carry any characters typed after the space into the next word
        m.buffer = remainder;
        if (m.idx < m.words.length) {
          m.typed[m.idx] = remainder;
          tally(m, 0, remainder, m.words[m.idx] ?? "");
        }
        e.target.value = remainder;
      } else {
        // no space: normal typing / backspace within the current word
        const cp = commonPrefix(m.buffer, value);
        tally(m, cp, value, m.words[m.idx] ?? "");
        m.buffer = value;
        m.typed[m.idx] = value;
      }

      // one quiet cue per input event: tick if everything new was right
      const added = m.total - beforeTotal;
      if (soundRef.current && added > 0) {
        (m.correct - beforeCorrect === added ? playTick : playError)();
      }

      // a challenge ends when the phrase does
      if (challengeRef.current && challengeDone(m)) {
        rerender();
        finish();
        return;
      }
      rerender();
    },
    [startTimer, tally, maybeExtend, rerender, finish]
  );

  // Monkeytype rule: backspace crosses the word boundary only when the
  // previous word was committed with an error; correct words are locked.
  // Handled on keydown because onChange never fires for an empty input.
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Backspace") return;
      const m = modelRef.current;
      if (!m || phaseRef.current === "finished") return;
      if (m.buffer.length > 0 || m.idx === 0) return;
      const prev = m.idx - 1;
      if (m.typed[prev] === m.words[prev]) return;
      e.preventDefault();
      m.idx = prev;
      m.buffer = m.typed[prev];
      rerender();
    },
    [rerender]
  );

  const restart = useCallback(() => {
    reset();
    // focus after the reset paints
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [reset]);

  // Global keys, kept polite for keyboard navigation:
  //  - plain Tab restarts only while typing (input focused) or on the results
  //    screen; Shift+Tab is never hijacked, so you can always tab backwards
  //  - Escape blurs the input (freeing Tab for navigation) and closes dialogs
  //  - any printable key while unfocused starts by focusing the input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inputFocused = document.activeElement === inputRef.current;
      // typing inside a panel form (challenge/submit) must never be hijacked
      const active = document.activeElement;
      const inPanelField =
        active instanceof HTMLElement &&
        active !== inputRef.current &&
        (active.tagName === "TEXTAREA" ||
          active.tagName === "INPUT" ||
          active.isContentEditable);
      if (e.key === "Tab" && !e.shiftKey) {
        // restart on Tab while typing, or fresh off a finish (focus on body).
        // once the typist tabs into the results (pace chart, glossary chips),
        // Tab goes back to navigating — never trap the keyboard.
        const freshFinish =
          phaseRef.current === "finished" &&
          document.activeElement === document.body;
        if ((inputFocused || freshFinish) && panelRef.current === "none") {
          e.preventDefault();
          restart();
        }
        return;
      }
      if (e.key === "Escape") {
        setConfirmVulgar(false);
        setPanel("none");
        if (inputFocused) inputRef.current?.blur();
        return;
      }
      // results screen: Enter also restarts, but never steals from a
      // focused element (e.g. the github link or the restart button itself)
      if (
        e.key === "Enter" &&
        phaseRef.current === "finished" &&
        document.activeElement === document.body
      ) {
        restart();
        return;
      }
      if (
        phaseRef.current !== "finished" &&
        !inputFocused &&
        !inPanelField &&
        panelRef.current === "none" &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
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

  /** Options were clicked with the mouse; hand focus straight back to typing. */
  const refocus = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleMode = (id: string) => {
    setModeId(id);
    refocus();
  };
  const handleDuration = (d: number) => {
    setDuration(d);
    refocus();
  };
  const handleToggleUncensored = () => {
    if (uncensored) {
      setUncensored(false);
      // if we were in the gated mode, drop back to the default
      if (getMode(modeId).gated) setModeId(DEFAULT_MODE_ID);
      refocus();
    } else {
      setPanel("none"); // one popover at a time
      setConfirmVulgar(true);
    }
  };
  const confirmUncensored = () => {
    setUncensored(true);
    setConfirmVulgar(false);
    // you asked for it — go straight to the mode you just unlocked
    setModeId("vulgar");
    refocus();
  };
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundPref(next);
    refocus();
  };
  const togglePanel = (which: Panel) => {
    setConfirmVulgar(false);
    setPanel((p) => (p === which ? "none" : which));
  };
  /** "try it now" in the creator: load the challenge in this tab. */
  const tryChallenge = (encoded: string) => {
    setPanel("none");
    window.location.hash = `c=${encoded}`; // hashchange listener does the rest
    refocus();
  };
  const exitChallenge = () => {
    // drop the fragment without adding a history entry, then leave challenge mode
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setChallenge(null);
    refocus();
  };

  const m = modelRef.current;
  const showHint = !focused && phase !== "finished";
  const source =
    (challenge || mode.type === "quotes") && m ? currentSource(m) : null;

  return (
    <div className="test">
      <div className="modebar-wrap">
        {challenge ? (
          <div className="modebar challenge-bar" role="toolbar" aria-label="challenge">
            <span className="challenge-label">
              custom challenge{challenge.by ? ` — set by ${challenge.by}` : ""}
            </span>
            <div className="divider" aria-hidden />
            <button onClick={exitChallenge}>exit challenge</button>
          </div>
        ) : (
          <ModeBar
            modes={modes}
            activeMode={modeId}
            onMode={handleMode}
            durations={DURATIONS}
            activeDuration={duration}
            onDuration={handleDuration}
            uncensored={uncensored}
            onToggleUncensored={handleToggleUncensored}
            soundOn={soundOn}
            onToggleSound={handleToggleSound}
            onOpenChallenge={() => togglePanel("challenge")}
            onOpenSubmit={() => togglePanel("submit")}
          />
        )}
        {panel === "challenge" && (
          <ChallengePanel onClose={() => setPanel("none")} onTry={tryChallenge} />
        )}
        {panel === "submit" && <SubmitPanel onClose={() => setPanel("none")} />}
        {confirmVulgar && (
          <div className="confirm" role="alertdialog" aria-label="uncensored mode warning">
            <span className="warn">you asked for it ah —</span>
            <span>uncensored mode has real hokkien vulgarities.</span>
            <button className="btn" onClick={confirmUncensored} autoFocus>
              onz lah
            </button>
            <button className="btn" onClick={() => setConfirmVulgar(false)}>
              nvm
            </button>
          </div>
        )}
      </div>

      <div className="test-center">
        {phase !== "finished" && (
          <div className="timer" aria-live="off">
            {phase === "running"
              ? challenge
                ? Math.floor(timeLeft) // counts up until the phrase is done
                : Math.ceil(timeLeft)
              : " "}
          </div>
        )}

        {phase === "finished" && result ? (
          <Stats
            result={result}
            previous={prevResult}
            personalBest={personalBest}
            isNewBest={isNewBest}
            modeLabel={challenge ? "challenge" : mode.label}
            duration={duration}
            isChallenge={challenge !== null}
            pace={pace}
            attempted={attempted}
            onRestart={restart}
          />
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
              onKeyDown={onInputKeyDown}
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
            {source && <div className="quote-source">— {source}</div>}
            {showHint && (
              <div className="focus-hint">
                <span className="hint-pointer">
                  click here or press any key to start
                </span>
                <span className="hint-touch">tap here to start lah</span>
              </div>
            )}
          </div>
        )}

        {phase !== "finished" && (
          <div className="retry">
            <button onClick={restart} aria-label="restart test">
              restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
