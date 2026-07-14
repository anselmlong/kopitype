"use client";

import { ModeDef } from "@/lib/corpus";

interface ModeBarProps {
  modes: ModeDef[];
  activeMode: string;
  onMode: (id: string) => void;
  durations: number[];
  activeDuration: number;
  onDuration: (d: number) => void;
  uncensored: boolean;
  onToggleUncensored: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export default function ModeBar({
  modes,
  activeMode,
  onMode,
  durations,
  activeDuration,
  onDuration,
  uncensored,
  onToggleUncensored,
  soundOn,
  onToggleSound,
}: ModeBarProps) {
  return (
    <div className="modebar" role="toolbar" aria-label="test options">
      <div className="group" role="group" aria-label="mode">
        {modes.map((m) => (
          <button
            key={m.id}
            className={m.id === activeMode ? "active" : ""}
            aria-pressed={m.id === activeMode}
            onClick={() => onMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="divider" aria-hidden />

      <div className="group" role="group" aria-label="duration">
        {durations.map((d) => (
          <button
            key={d}
            className={d === activeDuration ? "active" : ""}
            aria-pressed={d === activeDuration}
            onClick={() => onDuration(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="divider" aria-hidden />

      <button
        className={"uncensored" + (uncensored ? " on" : "")}
        aria-pressed={uncensored}
        onClick={onToggleUncensored}
        title="hokkien vulgarities. off by default."
      >
        {uncensored ? "uncensored ✓" : "uncensored"}
      </button>

      <div className="divider" aria-hidden />

      <button
        className={"sound" + (soundOn ? " on" : "")}
        aria-pressed={soundOn}
        onClick={onToggleSound}
        title="quiet keystroke and finish sounds"
      >
        {soundOn ? "sound ✓" : "sound"}
      </button>
    </div>
  );
}
