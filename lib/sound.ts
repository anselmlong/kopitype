/**
 * Tiny WebAudio sound kit — everything is synthesized, no audio assets.
 * All cues are quiet and short (<200ms); the typing rhythm is the music.
 * Muting is persisted in localStorage.
 */

const SOUND_KEY = "kopitype.sound";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // keystrokes are user gestures, so resume is allowed here
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One decaying note. Kept minimal on purpose. */
function note(
  freq: number,
  at: number,
  dur: number,
  peak: number,
  type: OscillatorType
) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur);
}

/** Soft high tick for a correct keystroke. */
export function playTick(): void {
  note(2100, 0, 0.03, 0.025, "triangle");
}

/** Duller, lower thock for a wrong keystroke. */
export function playError(): void {
  note(180, 0, 0.06, 0.05, "square");
}

/** Two-note kopi-cup clink when the timer runs out. */
export function playFinish(): void {
  note(660, 0, 0.12, 0.05, "sine");
  note(880, 0.09, 0.16, 0.05, "sine");
}

/** Rising three-note chime for a new personal best. */
export function playPersonalBest(): void {
  note(660, 0, 0.12, 0.05, "sine");
  note(830, 0.1, 0.12, 0.05, "sine");
  note(990, 0.2, 0.22, 0.06, "sine");
}

export function loadSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function saveSoundPref(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // fine
  }
}
