/** API client for the kopitype leaderboard backend. */

const API = "https://api.kopitype.com";

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

export async function fetchLeaderboard(
  mode: string,
  duration: number,
  limit = 20
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ mode, duration: String(duration), limit: String(limit) });
  const res = await fetch(`${API}/api/leaderboard?${params}`);
  if (!res.ok) return [];
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