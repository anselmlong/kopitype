"use client";

import { useCallback, useRef } from "react";
import { ModeDef } from "@/lib/corpus";

export type PanelId = "none" | "challenge" | "submit" | "leaderboard";

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
  onOpenChallenge: () => void;
  onOpenSubmit: () => void;
  onOpenLeaderboard: () => void;
  /** Which panel is currently open, so its button can show as pressed. */
  openPanel?: PanelId;
}

/**
 * Arrow-key handling for a single-select group (modes, durations).
 * One tab stop per group; arrows move *and* select, which is the standard
 * radiogroup contract. Tab and Shift+Tab are never touched — Tab still
 * restarts the test, and keyboard navigation always escapes the bar.
 */
function useRadioKeys<T>(
  items: readonly T[],
  activeIndex: number,
  select: (item: T) => void
) {
  return useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
      if (!KEYS.includes(e.key) || items.length === 0) return;
      e.preventDefault();

      const last = items.length - 1;
      let next: number;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = last;
      else if (e.key === "ArrowRight" || e.key === "ArrowDown")
        next = activeIndex >= last ? 0 : activeIndex + 1;
      else next = activeIndex <= 0 ? last : activeIndex - 1;

      select(items[next]);
      // move focus to the newly checked radio (roving tabindex)
      const group = e.currentTarget;
      const radios = group.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      radios[next]?.focus();
    },
    [items, activeIndex, select]
  );
}

/** A toggle's state, as a fixed-width glyph — never changes the label's width. */
function StateDot({ on }: { on: boolean }) {
  return <span className="mb-dot" aria-hidden>{on ? "●" : "○"}</span>;
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
  onOpenChallenge,
  onOpenSubmit,
  onOpenLeaderboard,
  openPanel = "none",
}: ModeBarProps) {
  const modeIndex = Math.max(0, modes.findIndex((m) => m.id === activeMode));
  const durIndex = Math.max(0, durations.indexOf(activeDuration));

  const modeKeys = useRadioKeys(modes, modeIndex, (m) => onMode(m.id));
  const durKeys = useRadioKeys(durations, durIndex, (d) => onDuration(d));

  const barRef = useRef<HTMLDivElement>(null);

  return (
    <div className="modebar" ref={barRef}>
      {/* ---- what you're typing: mode, then how long ---- */}
      <div className="mb-primary">
        <div
          className="mb-group"
          role="radiogroup"
          aria-label="what to type"
          onKeyDown={modeKeys}
        >
          {modes.map((m, i) => {
            const on = m.id === activeMode;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={i === modeIndex ? 0 : -1}
                className={`mb-btn mb-mode${on ? " is-on" : ""}`}
                onClick={() => onMode(m.id)}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <span className="mb-rule" aria-hidden />

        <div
          className="mb-group"
          role="radiogroup"
          aria-label="how long"
          onKeyDown={durKeys}
        >
          {durations.map((d, i) => {
            const on = d === activeDuration;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${d} seconds`}
                tabIndex={i === durIndex ? 0 : -1}
                className={`mb-btn mb-dur${on ? " is-on" : ""}`}
                onClick={() => onDuration(d)}
              >
                {d}
                <span className="mb-unit" aria-hidden>s</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- everything else: settings, then places to go ---- */}
      <div className="mb-secondary">
        <div className="mb-group" role="group" aria-label="settings">
          <button
            type="button"
            className={`mb-btn mb-toggle mb-uncensored${uncensored ? " is-on" : ""}`}
            aria-pressed={uncensored}
            onClick={onToggleUncensored}
            title="unlock the hokkien vulgarities. off by default."
          >
            <StateDot on={uncensored} />
            uncensored
          </button>
          <button
            type="button"
            className={`mb-btn mb-toggle${soundOn ? " is-on" : ""}`}
            aria-pressed={soundOn}
            onClick={onToggleSound}
            title="quiet keystroke and finish sounds"
          >
            <StateDot on={soundOn} />
            sound
          </button>
        </div>

        <span className="mb-rule" aria-hidden />

        <div className="mb-group" role="group" aria-label="more">
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "leaderboard" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "leaderboard"}
            onClick={onOpenLeaderboard}
            title="fastest runs for this mode and time"
          >
            leaderboard
          </button>
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "challenge" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "challenge"}
            onClick={onOpenChallenge}
            title="set your own phrase and share the link"
          >
            challenge
          </button>
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "submit" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "submit"}
            onClick={onOpenSubmit}
            title="send in a word or a quote for the corpus"
          >
            contribute
          </button>
        </div>
      </div>
    </div>
  );
}
