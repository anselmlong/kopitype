"use client";

import { useMemo, useState } from "react";
import { SubmissionKind, submissionUrl } from "@/lib/submit";

interface SubmitPanelProps {
  onClose: () => void;
}

/**
 * Crowdsourcing with a curation gate: the form opens a prefilled GitHub
 * issue, so every submission is reviewed before it joins the corpora.
 */
export default function SubmitPanel({ onClose }: SubmitPanelProps) {
  const [kind, setKind] = useState<SubmissionKind>("words");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [meaning, setMeaning] = useState("");

  const url = useMemo(
    () => submissionUrl({ kind, content, source, meaning }),
    [kind, content, source, meaning]
  );

  return (
    <div className="panel" role="dialog" aria-label="submit words or quotes">
      <div className="panel-title">submit to the corpus</div>
      <p className="panel-blurb">
        got a word or phrase we missed? send it over — it opens a github issue,
        gets vetted, then joins the rotation.
      </p>
      <div className="panel-kind" role="group" aria-label="submission type">
        <button
          className={kind === "words" ? "active" : ""}
          aria-pressed={kind === "words"}
          onClick={() => setKind("words")}
        >
          words
        </button>
        <button
          className={kind === "quote" ? "active" : ""}
          aria-pressed={kind === "quote"}
          onClick={() => setKind("quote")}
        >
          quote
        </button>
      </div>
      <textarea
        className="panel-input"
        rows={3}
        placeholder={
          kind === "words"
            ? "words, separated by spaces or commas — paynow, shiok, mlbb"
            : "the full phrase — eh paynow me the kopi money leh"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
      {kind === "quote" && (
        <input
          className="panel-input"
          type="text"
          maxLength={40}
          placeholder="source — kopi order, gamer life, adulting…"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      )}
      <input
        className="panel-input"
        type="text"
        maxLength={120}
        placeholder="what it means (optional — feeds the glossary)"
        value={meaning}
        onChange={(e) => setMeaning(e.target.value)}
      />
      <div className="panel-actions">
        <a
          className={`btn${url ? "" : " disabled"}`}
          href={url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!url}
          onClick={(e) => {
            if (!url) e.preventDefault();
          }}
        >
          open github issue
        </a>
        <button className="btn quiet" onClick={onClose}>
          close
        </button>
      </div>
      <p className="panel-fine">needs a github account. free one lah.</p>
    </div>
  );
}
