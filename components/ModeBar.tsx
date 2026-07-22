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

/* Compact line icons — shown in place of the labels on phones (see .mb-icon).
   Monoline, currentColor, so they inherit the button's state colour.
   Sound is icon-only everywhere; the rest are icon-only below 640px. */
const svg = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "mb-icon",
  "aria-hidden": true,
};

/** speaker, with sound waves or a mute cross depending on state */
function IconSound({ on }: { on: boolean }) {
  return (
    <svg {...svg}>
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" />
      {on ? (
        <>
          <path d="M10.5 6.4a2.4 2.4 0 0 1 0 3.2" />
          <path d="M12.4 4.6a5 5 0 0 1 0 6.8" />
        </>
      ) : (
        <path d="M11 6.5l3 3M14 6.5l-3 3" />
      )}
    </svg>
  );
}

/** ascending bars — the leaderboard */
function IconBoard() {
  return (
    <svg {...svg}>
      <path d="M3 13.5V9M8 13.5V3.5M13 13.5V6.5" />
    </svg>
  );
}

/** a flag — set your own challenge */
function IconFlag() {
  return (
    <svg {...svg}>
      <path d="M4 14V2.5" />
      <path d="M4 3.2h7.5L9.7 5.8l1.8 2.6H4" />
    </svg>
  );
}

/** a plus — contribute to the corpus */
function IconPlus() {
  return (
    <svg {...svg}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export default function ModeBar({
  modes,
  activeMode,
  onMode,
  durations,
  activeDuration,
  onDuration,
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
            className={`mb-btn mb-toggle mb-iconbtn${soundOn ? " is-on" : ""}`}
            aria-pressed={soundOn}
            aria-label="sound"
            onClick={onToggleSound}
            title={soundOn ? "sound on — click to mute" : "sound off — click to unmute"}
          >
            <IconSound on={soundOn} />
          </button>
        </div>

        <span className="mb-rule" aria-hidden />

        <div className="mb-group" role="group" aria-label="more">
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "leaderboard" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "leaderboard"}
            aria-label="leaderboard"
            onClick={onOpenLeaderboard}
            title="fastest runs for this mode and time"
          >
            <IconBoard />
            <span className="mb-label">leaderboard</span>
          </button>
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "challenge" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "challenge"}
            aria-label="challenge"
            onClick={onOpenChallenge}
            title="set your own phrase and share the link"
          >
            <IconFlag />
            <span className="mb-label">challenge</span>
          </button>
          <button
            type="button"
            className={`mb-btn mb-open${openPanel === "submit" ? " is-open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={openPanel === "submit"}
            aria-label="contribute"
            onClick={onOpenSubmit}
            title="send in a word or a quote for the corpus"
          >
            <IconPlus />
            <span className="mb-label">contribute</span>
          </button>
        </div>
      </div>
    </div>
  );
}
