/** API client for the kopitype leaderboard backend. */

// Configurable so local dev (and previews) can point at a local backend.
// Falls back to the production API when the env var isn't set.
const API =
  process.env.NEXT_PUBLIC_LEADERBOARD_API?.replace(/\/$/, "") ||
  "https://api.kopitype.com";

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  wpm: number;
  accuracy: number;
  raw: number;
  ts: number;
}

export interface SubmitResult {
  success: boolean;
  rank: number;
  total: number;
}

/**
 * Fetch the top scores for a mode + duration. Throws on network/HTTP failure
 * so the caller can tell "the board is empty" apart from "the board is down".
 */
export async function fetchLeaderboard(
  mode: string,
  duration: number,
  limit = 20
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ mode, duration: String(duration), limit: String(limit) });
  const res = await fetch(`${API}/api/leaderboard?${params}`);
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return res.json();
}

export async function submitScore(
  nickname: string,
  wpm: number,
  accuracy: number,
  mode: string,
  duration: number,
  raw: number
): Promise<SubmitResult | null> {
  try {
    const res = await fetch(`${API}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, wpm, accuracy, mode, duration, raw }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
