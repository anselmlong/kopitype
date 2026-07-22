"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLeaderboard, submitScore, LeaderboardEntry, SubmitResult } from "@/lib/leaderboard";

interface LeaderboardProps {
  /** The just-finished run, or null when opened without a score (view-only). */
  score: { wpm: number; accuracy: number; raw: number } | null;
  mode: string;
  duration: number;
  onClose: () => void;
}

type BoardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; entries: LeaderboardEntry[] }
  | { status: "error" };

export default function Leaderboard({ score, mode, duration, onClose }: LeaderboardProps) {
  const hasScore = score !== null;
  const [board, setBoard] = useState<BoardState>({ status: "idle" });
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  // with a fresh score you land on "submit"; view-only opens straight to the board
  const [tab, setTab] = useState<"submit" | "board">(hasScore ? "submit" : "board");
  const inputRef = useRef<HTMLInputElement>(null);

  // load saved nickname
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("kopitype.nickname");
      if (saved) setNickname(saved);
    }
    inputRef.current?.focus();
  }, []);

  const loadBoard = useCallback(async () => {
    setBoard({ status: "loading" });
    try {
      const entries = await fetchLeaderboard(mode, duration);
      setBoard({ status: "ready", entries });
    } catch {
      setBoard({ status: "error" });
    }
  }, [mode, duration]);

  const handleSubmit = useCallback(async () => {
    if (!score) return;
    const n = nickname.trim();
    if (!n || n.length > 30) return;
    setSubmitting(true);
    setSubmitError(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kopitype.nickname", n);
    }
    const res = await submitScore(n, score.wpm, score.accuracy, mode, duration, score.raw);
    setSubmitting(false);
    if (res) {
      setSubmitResult(res);
      setSubmitted(true);
      setTab("board");
    } else {
      setSubmitError(true);
    }
  }, [nickname, score, mode, duration]);

  // (re)load the board whenever it's the active tab
  useEffect(() => {
    if (tab === "board") loadBoard();
  }, [tab, loadBoard]);

  return (
    <div className="panel leaderboard-panel" role="dialog" aria-label="leaderboard">
      <div className="panel-title">
        {tab === "submit" ? "submit your score" : "leaderboard"}
      </div>

      {tab === "submit" && hasScore && !submitted && (
        <div className="lb-submit">
          <p className="lb-blurb">
            {score.wpm} wpm · {score.accuracy}% accuracy
          </p>
          <input
            ref={inputRef}
            className="panel-input"
            type="text"
            maxLength={30}
            placeholder="your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            autoFocus
          />
          <button
            className={`btn${nickname.trim() ? "" : " disabled"}`}
            onClick={handleSubmit}
            disabled={!nickname.trim() || submitting}
          >
            {submitting ? "submitting..." : "submit score"}
          </button>
          {submitError && (
            <p className="lb-error">couldn&apos;t reach the leaderboard — try again later</p>
          )}
        </div>
      )}

      {submitted && submitResult && (
        <div className="lb-result">
          <p className="lb-rank-big">
            #{submitResult.rank} of {submitResult.total}
          </p>
        </div>
      )}

      <div className="lb-tabs">
        <button
          className={tab === "board" ? "active" : ""}
          onClick={() => setTab("board")}
        >
          leaderboard
        </button>
        {hasScore && !submitted && (
          <button
            className={tab === "submit" ? "active" : ""}
            onClick={() => setTab("submit")}
          >
            submit
          </button>
        )}
      </div>

      {tab === "board" && (
        <div className="lb-table-wrap">
          {board.status === "loading" && (
            <p className="lb-empty">loading…</p>
          )}
          {board.status === "error" && (
            <p className="lb-empty">
              leaderboard&apos;s not reachable right now.{" "}
              <button className="lb-retry" onClick={loadBoard}>retry</button>
            </p>
          )}
          {board.status === "ready" && (
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>name</th>
                  <th>wpm</th>
                  <th>acc</th>
                </tr>
              </thead>
              <tbody>
                {board.entries.length === 0 && (
                  <tr><td colSpan={4} className="lb-empty">no scores yet — be the first!</td></tr>
                )}
                {board.entries.map((s) => (
                  <tr key={`${s.rank}-${s.ts}`} className={s.nickname === nickname ? "lb-me" : ""}>
                    <td className="lb-rank-cell">{s.rank <= 3 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}</td>
                    <td className="lb-name">{s.nickname}</td>
                    <td className="lb-wpm">{s.wpm}</td>
                    <td className="lb-acc">{s.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="panel-actions">
        <button className="btn quiet" onClick={onClose}>
          close
        </button>
      </div>
    </div>
  );
}
