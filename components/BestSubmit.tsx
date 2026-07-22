"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLeaderboard, submitScore } from "@/lib/leaderboard";

interface BestSubmitProps {
  wpm: number;
  accuracy: number;
  raw: number;
  mode: string;
  duration: number;
}

type State =
  | { s: "loading" } // fetching the board to preview where this run lands
  | { s: "ready"; projected: number } // "would sit #x globally"
  | { s: "naming" } // asking for a nickname before submitting
  | { s: "submitting" }
  | { s: "done"; rank: number; total: number }
  | { s: "error" }; // board unreachable — fail quiet, don't sour the moment

const NICK_KEY = "kopitype.nickname";

/**
 * Shown on the results screen the instant a run is a new personal best.
 * It checks the global board, tells the typist where the run would land, and
 * lets them put it up with one tap (nickname remembered from last time).
 * If the board can't be reached it renders nothing — a PB shouldn't come with
 * an error message attached.
 */
export default function BestSubmit({ wpm, accuracy, raw, mode, duration }: BestSubmitProps) {
  const [state, setState] = useState<State>({ s: "loading" });
  const [nickname, setNickname] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // preview: fetch the board once and count how many players sit above this run
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(NICK_KEY);
      if (saved) setNickname(saved);
    }
    let alive = true;
    fetchLeaderboard(mode, duration, 100)
      .then((entries) => {
        if (!alive) return;
        const ahead = entries.filter((e) => e.wpm > wpm).length;
        setState({ s: "ready", projected: ahead + 1 });
      })
      .catch(() => {
        if (alive) setState({ s: "error" });
      });
    return () => {
      alive = false;
    };
  }, [mode, duration, wpm]);

  const submit = useCallback(
    async (name: string) => {
      const n = name.trim();
      if (!n) {
        setState({ s: "naming" });
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      if (typeof window !== "undefined") window.localStorage.setItem(NICK_KEY, n);
      setState({ s: "submitting" });
      const res = await submitScore(n, wpm, accuracy, mode, duration, raw);
      if (res) setState({ s: "done", rank: res.rank, total: res.total });
      else setState({ s: "error" });
    },
    [wpm, accuracy, mode, duration, raw]
  );

  // one tap: submit straight away if we already know the name, else ask for it
  const onPutUp = () => {
    if (nickname.trim()) submit(nickname);
    else {
      setState({ s: "naming" });
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  if (state.s === "error") return null;

  if (state.s === "done") {
    return (
      <div className="lb-best is-done" role="status">
        <span className="lb-best-line">
          you&apos;re <strong>#{state.rank}</strong> of {state.total} on the global board — shiok!
        </span>
      </div>
    );
  }

  const submitting = state.s === "submitting";

  return (
    <div className="lb-best" role="group" aria-label="add this run to the global leaderboard">
      <span className="lb-best-line">
        {state.s === "loading" && "checking the global board…"}
        {state.s === "ready" && (
          <>
            this run would sit <strong>#{state.projected}</strong> on the global board
          </>
        )}
        {(state.s === "naming" || submitting) && "put your run on the global board"}
      </span>

      {state.s === "naming" ? (
        <div className="lb-best-form">
          <input
            ref={inputRef}
            className="panel-input"
            type="text"
            maxLength={30}
            placeholder="your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(nickname);
            }}
            aria-label="nickname"
          />
          <button className="btn" onClick={() => submit(nickname)} disabled={!nickname.trim()}>
            submit
          </button>
        </div>
      ) : (
        <button className="btn" onClick={onPutUp} disabled={state.s === "loading" || submitting}>
          {submitting ? "submitting…" : "put your name up"}
        </button>
      )}
    </div>
  );
}
