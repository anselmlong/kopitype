"use client";

import { TestResult } from "@/lib/wpm";

interface StatsProps {
  result: TestResult;
  previous: TestResult | null;
  onRestart: () => void;
}

export default function Stats({ result, previous, onRestart }: StatsProps) {
  return (
    <div className="stats">
      <div className="stats-main">
        <div className="stat">
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

      <div className="stats-sub">
        <span>
          chars {result.correctChars}/{result.typedChars}
        </span>
        <span>time {result.seconds}s</span>
        {previous && (
          <span className="prev-score">
            prev {previous.wpm} wpm · {previous.accuracy}%
          </span>
        )}
      </div>

      <div className="actions">
        <button className="btn" onClick={onRestart} autoFocus>
          restart
        </button>
        <span className="hint-key">
          or press <kbd>Tab</kbd> to go again
        </span>
      </div>
    </div>
  );
}
