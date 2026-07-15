"use client";

import { TestResult } from "@/lib/wpm";
import { PersonalBest } from "@/lib/records";
import { PacePoint } from "@/lib/pace";
import PaceChart from "./PaceChart";
import GlossaryWords from "./GlossaryWords";

interface StatsProps {
  result: TestResult;
  previous: TestResult | null;
  /** Best before this run (null on a first-ever run). */
  personalBest: PersonalBest | null;
  isNewBest: boolean;
  modeLabel: string;
  duration: number;
  /** True for a shared fixed-phrase challenge (duration is elapsed time). */
  isChallenge: boolean;
  /** Per-second pace samples for the graph. */
  pace: PacePoint[];
  /** Target words the typist attempted, for the glossary recap. */
  attempted: string[];
  onRestart: () => void;
}

export default function Stats({
  result,
  previous,
  personalBest,
  isNewBest,
  modeLabel,
  duration,
  isChallenge,
  pace,
  attempted,
  onRestart,
}: StatsProps) {
  const seconds = isChallenge
    ? `${result.seconds.toFixed(1)}s`
    : `${duration}s`;
  return (
    <div className="stats" role="status" aria-live="polite">
      <div className="stats-context">
        {modeLabel} · {seconds}
        {isNewBest && <span className="new-best">new personal best!</span>}
      </div>

      <div className="stats-main">
        <div className={`stat${isNewBest ? " best" : ""}`}>
          <div className="label">wpm</div>
          <div className="value">{result.wpm}</div>
        </div>
        <div className="stat small">
          <div className="label">accuracy</div>
          <div className="value">
            {result.accuracy}
            <span className="unit">%</span>
          </div>
        </div>
        <div className="stat small">
          <div className="label">raw</div>
          <div className="value">{result.rawWpm}</div>
        </div>
      </div>

      <PaceChart points={pace} />

      <GlossaryWords words={attempted} />

      <div className="stats-sub">
        <span>
          chars {result.correctChars}/{result.typedChars}
        </span>
        {previous && (
          <span>
            prev {previous.wpm} wpm · {previous.accuracy}%
          </span>
        )}
        {personalBest && !isNewBest && (
          <span>
            pb {personalBest.wpm} wpm · {personalBest.accuracy}%
          </span>
        )}
        {isNewBest && personalBest && (
          <span>old pb {personalBest.wpm} wpm</span>
        )}
      </div>

      <div className="actions">
        <button className="btn" onClick={onRestart}>
          restart
        </button>
        <span className="hint-key">
          or press <kbd>Tab</kbd> to go again
        </span>
      </div>
    </div>
  );
}
