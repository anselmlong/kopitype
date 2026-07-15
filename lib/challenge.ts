/**
 * Custom challenges: a fixed phrase, encoded into a shareable URL.
 *
 * There is no backend, so the challenge itself travels in the link — a
 * base64url-encoded JSON blob in the URL fragment (#c=...). Anyone with the
 * link types the exact same phrase; the test ends when the phrase does.
 */

export interface Challenge {
  /** The phrase to type. Normalized: lowercase, single-spaced. */
  text: string;
  /** Optional name of whoever set the challenge. */
  by?: string;
}

export const MAX_TEXT_LENGTH = 300;
export const MAX_BY_LENGTH = 40;

/**
 * Normalize free-typed input into a typeable phrase: lowercase (the whole app
 * is lowercase), whitespace collapsed, control characters stripped.
 */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
    .trim();
}

function normalizeBy(raw: string | undefined): string | undefined {
  const by = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_BY_LENGTH).trim();
  return by.length > 0 ? by : undefined;
}

/** Unicode-safe base64url. */
function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Encode a challenge for a URL. Returns null if the text normalizes to nothing. */
export function encodeChallenge(raw: { text: string; by?: string }): string | null {
  const text = normalizeText(raw.text);
  if (!text) return null;
  const c: Challenge = { text };
  const by = normalizeBy(raw.by);
  if (by) c.by = by;
  return toBase64Url(JSON.stringify(c));
}

/** Decode + validate a challenge payload. Null on anything malformed. */
export function decodeChallenge(encoded: string): Challenge | null {
  const json = fromBase64Url(encoded);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const rawText = (parsed as { text?: unknown }).text;
    if (typeof rawText !== "string") return null;
    const text = normalizeText(rawText);
    if (!text) return null;
    const c: Challenge = { text };
    const rawBy = (parsed as { by?: unknown }).by;
    if (typeof rawBy === "string") {
      const by = normalizeBy(rawBy);
      if (by) c.by = by;
    }
    return c;
  } catch {
    return null;
  }
}

const HASH_KEY = "c";

/** Full shareable link for a challenge, given the page's base URL. */
export function challengeUrl(encoded: string, baseUrl: string): string {
  return `${baseUrl.replace(/#.*$/, "")}#${HASH_KEY}=${encoded}`;
}

/** Pull a challenge out of a location.hash string ("#c=..."). */
export function challengeFromHash(hash: string): Challenge | null {
  const m = /^#?c=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  return decodeChallenge(m[1]);
}
