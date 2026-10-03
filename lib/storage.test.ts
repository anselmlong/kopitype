import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSoundPref, saveSoundPref } from "./sound";
import { loadNickname, saveNickname } from "./leaderboard";

// Some browsers throw on any localStorage access when site data is blocked
// (privacy settings, sandboxed iframes). Reading prefs must never crash the app.
describe("preferences with storage blocked", () => {
  beforeEach(() => {
    (globalThis as any).window = {};
    Object.defineProperty((globalThis as any).window, "localStorage", {
      get() {
        throw new Error("SecurityError: The operation is insecure.");
      },
    });
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("loadSoundPref falls back to on", () => {
    expect(loadSoundPref()).toBe(true);
  });

  it("saveSoundPref is a silent no-op", () => {
    expect(() => saveSoundPref(false)).not.toThrow();
  });

  it("loadNickname falls back to empty", () => {
    expect(loadNickname()).toBe("");
  });

  it("saveNickname is a silent no-op", () => {
    expect(() => saveNickname("ah boy")).not.toThrow();
  });
});

describe("nickname with working storage", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("round-trips", () => {
    expect(loadNickname()).toBe("");
    saveNickname("ah girl");
    expect(loadNickname()).toBe("ah girl");
  });
});
