"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLeaderboard, submitScore, LeaderboardEntry, SubmitResult } from "@/lib/leaderboard";

interface LeaderboardProps {
  wpm: number;
  accuracy: number;
  raw: number;
  mode: string;
  duration: number;
  onClose: () => void;
}

export default function Leaderboard({ wpm, accuracy, raw, mode, duration, onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"submit" | "board">("submit");
  const inputRef = useRef<HTMLInputElement>(null);

  // load saved nickname
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("kopitype.nickname");
      if (saved) setNickname(saved);
    }
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const n = nickname.trim();
    if (!n || n.length > 30) return;
    setSubmitting(true);
    // save nickname
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kopitype.nickname", n);
    }
    const res = await submitScore(n, wpm, accuracy, mode, duration, raw);
    if (res) {
      setSubmitResult(res);
      setSubmitted(true);
      setTab("board");
    }
    setSubmitting(false);
  }, [nickname, wpm, accuracy, mode, duration, raw]);

  // load leaderboard when tab switches to board
  useEffect(() => {
    if (tab === "board") {
      fetchLeaderboard(mode, duration).then(setScores);
    }
  }, [tab, mode, duration]);

  return (
    <div className="panel leaderboard-panel" role="dialog" aria-label="leaderboard">
      <div className="panel-title">
        {tab === "submit" ? "submit your score" : "leaderboard"}
      </div>

      {tab === "submit" && !submitted && (
        <div className="lb-submit">
          <p className="lb-blurb">
            {wpm} wpm · {accuracy}% accuracy
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
          {submitResult && (
            <p className="lb-rank">
              you're #{submitResult.rank} of {submitResult.total}!
            </p>
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
        {!submitted && (
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
              {scores.length === 0 && (
                <tr><td colSpan={4} className="lb-empty">no scores yet — be the first!</td></tr>
              )}
              {scores.map((s) => (
                <tr key={`${s.rank}-${s.ts}`} className={s.nickname === nickname ? "lb-me" : ""}>
                  <td className="lb-rank-cell">{s.rank <= 3 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}</td>
                  <td className="lb-name">{s.nickname}</td>
                  <td className="lb-wpm">{s.wpm}</td>
                  <td className="lb-acc">{s.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
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