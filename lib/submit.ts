/**
 * Crowdsourced corpus submissions — with no backend, the review queue is the
 * GitHub repo itself. The submit form composes a prefilled GitHub issue; the
 * maintainer vets it and merges accepted entries into data/*.json, so every
 * addition is curated before it ships.
 */

const REPO_ISSUES_URL = "https://github.com/anselmlong/kopitype/issues/new";

export type SubmissionKind = "words" | "quote";

export interface Submission {
  kind: SubmissionKind;
  /** Words: whitespace/comma-separated tokens. Quote: the full phrase. */
  content: string;
  /** Quote attribution ("kopi order", "gamer life", ...). */
  source?: string;
  /** Optional short meaning(s) for the glossary. */
  meaning?: string;
}

/** Words: split, lowercase, dedupe, drop anything with spaces baked in. */
export function parseWords(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of content.split(/[\s,]+/)) {
    const w = raw.trim().toLowerCase();
    if (!w || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/** Build the prefilled GitHub issue URL for a submission, or null if empty. */
export function submissionUrl(s: Submission): string | null {
  let title: string;
  let payload: string;

  if (s.kind === "words") {
    const words = parseWords(s.content);
    if (words.length === 0) return null;
    title = `corpus: ${words.slice(0, 5).join(", ")}${words.length > 5 ? ", …" : ""}`;
    payload = JSON.stringify(words, null, 2);
  } else {
    const text = s.content.replace(/\s+/g, " ").trim().toLowerCase();
    if (!text) return null;
    const source = (s.source ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    title = `corpus: "${text.length > 48 ? text.slice(0, 48) + "…" : text}"`;
    payload = JSON.stringify({ text, source: source || "daily life" }, null, 2);
  }

  const meaning = (s.meaning ?? "").trim();
  const body = [
    `**type**: ${s.kind}`,
    "",
    "```json",
    payload,
    "```",
    ...(meaning ? ["", `**meaning (for the glossary)**: ${meaning}`] : []),
    "",
    "---",
    "submitted from the kopitype submit form. maintainer: vet it, then add to",
    "`data/words.json` / `data/sg.json` / `data/quotes.json` and (if a meaning",
    "was given) `data/glossary.json`.",
  ].join("\n");

  const params = new URLSearchParams({
    title,
    body,
    labels: "corpus-submission",
  });
  return `${REPO_ISSUES_URL}?${params.toString()}`;
}
