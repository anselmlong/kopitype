import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPersonalBest, savePersonalBest, PersonalBest } from "./records";

const PB: PersonalBest = { wpm: 72, accuracy: 96, ts: 1700000000000 };

describe("records without a window (SSR / node)", () => {
  it("getPersonalBest returns null instead of throwing", () => {
    expect(typeof window).toBe("undefined");
    expect(getPersonalBest("words", 30)).toBeNull();
  });

  it("savePersonalBest is a silent no-op", () => {
    expect(() => savePersonalBest("words", 30, PB)).not.toThrow();
  });
});

describe("records with a stubbed window.localStorage", () => {
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

  it("save/get round-trips a personal best", () => {
    savePersonalBest("words", 30, PB);
    expect(getPersonalBest("words", 30)).toEqual(PB);
  });

  it("returns null when nothing has been saved", () => {
    expect(getPersonalBest("words", 30)).toBeNull();
  });

  it("keys records per mode and duration independently", () => {
    const other: PersonalBest = { wpm: 55, accuracy: 90, ts: 1 };
    savePersonalBest("words", 30, PB);
    savePersonalBest("words", 60, other);
    savePersonalBest("mrt", 30, other);
    expect(getPersonalBest("words", 30)).toEqual(PB);
    expect(getPersonalBest("words", 60)).toEqual(other);
    expect(getPersonalBest("mrt", 30)).toEqual(other);
    expect(getPersonalBest("mrt", 60)).toBeNull();
  });

  it("returns null for corrupted JSON instead of throwing", () => {
    store.set("kopitype.pb.words.30", "{not json");
    expect(getPersonalBest("words", 30)).toBeNull();
  });

  it("returns null when the stored shape has no numeric wpm", () => {
    store.set("kopitype.pb.words.30", JSON.stringify({ wpm: "fast" }));
    expect(getPersonalBest("words", 30)).toBeNull();
  });

  it("swallows storage errors on save (quota full / blocked)", () => {
    (globalThis as any).window.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => savePersonalBest("words", 30, PB)).not.toThrow();
  });
});
