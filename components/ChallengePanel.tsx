"use client";

import { useMemo, useState } from "react";
import { MAX_TEXT_LENGTH, challengeUrl, encodeChallenge } from "@/lib/challenge";

interface ChallengePanelProps {
  onClose: () => void;
  /** Load the freshly minted challenge in this tab. */
  onTry: (encoded: string) => void;
}

/**
 * Make-your-own challenge: a fixed phrase anyone with the link must type.
 * The phrase travels inside the URL fragment — no backend, no storage.
 */
export default function ChallengePanel({ onClose, onTry }: ChallengePanelProps) {
  const [text, setText] = useState("");
  const [by, setBy] = useState("");
  const [copied, setCopied] = useState(false);

  const encoded = useMemo(() => encodeChallenge({ text, by }), [text, by]);
  const link = useMemo(() => {
    if (!encoded || typeof window === "undefined") return null;
    return challengeUrl(encoded, window.location.origin + window.location.pathname);
  }, [encoded]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the link is visible below, select it by hand
    }
  };

  return (
    <div className="panel" role="dialog" aria-label="create a custom challenge">
      <div className="panel-title">custom challenge</div>
      <p className="panel-blurb">
        set a phrase, share the link, see who types it fastest. the phrase lives
        in the link itself — nothing is stored anywhere.
      </p>
      <textarea
        className="panel-input"
        rows={3}
        maxLength={MAX_TEXT_LENGTH}
        placeholder="type the phrase here lah (lowercase, up to 300 chars)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <input
        className="panel-input"
        type="text"
        maxLength={40}
        placeholder="your name (optional)"
        value={by}
        onChange={(e) => setBy(e.target.value)}
      />
      {link && (
        <div className="panel-link" aria-live="polite">
          <span className="panel-link-url">{link}</span>
        </div>
      )}
      <div className="panel-actions">
        <button className="btn" onClick={copy} disabled={!link}>
          {copied ? "copied ✓" : "copy link"}
        </button>
        <button
          className="btn"
          onClick={() => encoded && onTry(encoded)}
          disabled={!encoded}
        >
          try it now
        </button>
        <button className="btn quiet" onClick={onClose}>
          close
        </button>
      </div>
    </div>
  );
}
