/**
 * Personal bests, persisted per mode+duration in localStorage.
 * No accounts, no backend — but no amnesia either.
 */

export interface PersonalBest {
  wpm: number;
  accuracy: number;
  ts: number;
}

const KEY_PREFIX = "kopitype.pb";

function key(modeId: string, duration: number): string {
  return `${KEY_PREFIX}.${modeId}.${duration}`;
}

export function getPersonalBest(
  modeId: string,
  duration: number
): PersonalBest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(modeId, duration));
    if (!raw) return null;
    const pb = JSON.parse(raw) as PersonalBest;
    return typeof pb.wpm === "number" ? pb : null;
  } catch {
    return null;
  }
}

export function savePersonalBest(
  modeId: string,
  duration: number,
  pb: PersonalBest
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(modeId, duration), JSON.stringify(pb));
  } catch {
    // storage full or blocked — shrug, it's just a typing test
  }
}
