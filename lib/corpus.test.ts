import { describe, it, expect } from "vitest";
import {
  MODES,
  DEFAULT_MODE_ID,
  getMode,
  visibleModes,
  shuffle,
  createStream,
  ModeDef,
} from "./corpus";

// Every quote is typed verbatim, so its text must be lowercase characters
// the test can actually capture: letters, digits, single spaces.
const TYPEABLE = /^[a-z0-9]+( [a-z0-9]+)*$/;

describe("MODES registry", () => {
  it("contains the expected mode ids", () => {
    const ids = MODES.map((m) => m.id);
    expect(ids).toContain("words");
    expect(ids).toContain("quote");
    expect(ids).toContain("mrt");
    expect(ids).toContain("xmm");
    expect(ids).toContain("vulgar");
  });

  it("every mode has a unique id and a label", () => {
    const ids = MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MODES) {
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it("word modes have a non-empty pool of single tokens (no spaces)", () => {
    const wordModes = MODES.filter((m) => m.type === "words");
    expect(wordModes.length).toBeGreaterThan(0);
    for (const m of wordModes) {
      expect(m.words, `${m.id} should ship a words array`).toBeDefined();
      expect(m.words!.length).toBeGreaterThan(0);
      for (const w of m.words!) {
        expect(typeof w).toBe("string");
        expect(w.length, `${m.id} has an empty token`).toBeGreaterThan(0);
        expect(w, `${m.id} token "${w}" contains whitespace`).not.toMatch(/\s/);
      }
    }
  });

  it("quote modes have non-empty, lowercase, typeable texts with sources", () => {
    const quoteModes = MODES.filter((m) => m.type === "quotes");
    expect(quoteModes.map((m) => m.id)).toEqual(
      expect.arrayContaining(["quote", "mrt", "xmm"])
    );
    for (const m of quoteModes) {
      expect(m.quotes, `${m.id} should ship a quotes array`).toBeDefined();
      expect(m.quotes!.length).toBeGreaterThan(0);
      for (const q of m.quotes!) {
        expect(q.text, `${m.id} quote "${q.text}"`).toMatch(TYPEABLE);
        expect(q.text).toBe(q.text.toLowerCase());
        expect(q.source.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("only the vulgar mode is gated", () => {
    const gated = MODES.filter((m) => m.gated);
    expect(gated.map((m) => m.id)).toEqual(["vulgar"]);
  });
});

describe("getMode", () => {
  it("returns the matching mode by id", () => {
    expect(getMode("mrt").id).toBe("mrt");
    expect(getMode("vulgar").id).toBe("vulgar");
  });

  it("falls back to the first mode for an unknown id", () => {
    expect(getMode("does-not-exist")).toBe(MODES[0]);
  });

  it("resolves the default mode id", () => {
    expect(getMode(DEFAULT_MODE_ID).id).toBe(DEFAULT_MODE_ID);
  });
});

describe("visibleModes", () => {
  it("hides gated modes by default", () => {
    const visible = visibleModes(false);
    expect(visible.some((m) => m.gated)).toBe(false);
    expect(visible.map((m) => m.id)).not.toContain("vulgar");
  });

  it("shows every mode when uncensored is on", () => {
    expect(visibleModes(true)).toEqual(MODES);
  });

  it("keeps registry order for ungated modes", () => {
    const visibleIds = visibleModes(false).map((m) => m.id);
    const expected = MODES.filter((m) => !m.gated).map((m) => m.id);
    expect(visibleIds).toEqual(expected);
  });
});

describe("shuffle", () => {
  it("returns a permutation of the input (same elements, same length)", () => {
    const input = ["lah", "leh", "lor", "sia", "meh", "hor"];
    const out = shuffle(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("does not mutate the original array", () => {
    const input = ["a", "b", "c", "d"];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["shiok"])).toEqual(["shiok"]);
  });
});

describe("createStream (words mode)", () => {
  it("caps a batch at 60 tokens from a large pool", () => {
    const mode = getMode("words");
    const batch = createStream(mode).next();
    expect(batch.words).toHaveLength(60);
    expect(batch.source).toBeUndefined();
    for (const w of batch.words) {
      expect(mode.words).toContain(w);
    }
  });

  it("returns the whole pool when it is smaller than a batch", () => {
    const tiny: ModeDef = {
      id: "tiny",
      label: "tiny",
      type: "words",
      words: ["kopi", "teh", "milo"],
    };
    const batch = createStream(tiny).next();
    expect([...batch.words].sort()).toEqual(["kopi", "milo", "teh"]);
  });

  it("keeps yielding batches on every next() call", () => {
    const stream = createStream(getMode("words"));
    for (let i = 0; i < 5; i++) {
      expect(stream.next().words.length).toBeGreaterThan(0);
    }
  });

  it("yields an empty batch for an empty pool without throwing", () => {
    const empty: ModeDef = { id: "e", label: "e", type: "words", words: [] };
    expect(createStream(empty).next()).toEqual({ words: [] });
  });
});

describe("createStream (quotes mode)", () => {
  it("yields one quote's words with its source attribution", () => {
    const single: ModeDef = {
      id: "one",
      label: "one",
      type: "quotes",
      quotes: [{ text: "kopi o kosong peng", source: "kopitiam uncle" }],
    };
    const batch = createStream(single).next();
    expect(batch.words).toEqual(["kopi", "o", "kosong", "peng"]);
    expect(batch.source).toBe("kopitiam uncle");
  });

  it("always attributes a source for real quote corpora", () => {
    for (const id of ["quote", "mrt", "xmm"]) {
      const stream = createStream(getMode(id));
      for (let i = 0; i < 20; i++) {
        const batch = stream.next();
        expect(batch.words.length).toBeGreaterThan(0);
        expect(batch.source && batch.source.length).toBeTruthy();
        // split on whitespace never yields empty tokens for typeable texts
        for (const w of batch.words) expect(w.length).toBeGreaterThan(0);
      }
    }
  });

  it("yields an empty, unattributed batch when the pool is empty", () => {
    const empty: ModeDef = { id: "eq", label: "eq", type: "quotes", quotes: [] };
    const batch = createStream(empty).next();
    expect(batch.words).toEqual([]);
    expect(batch.source).toBeUndefined();
  });

  it("only ever picks quotes from the given pool", () => {
    const mode = getMode("mrt");
    const texts = new Set(mode.quotes!.map((q) => q.text));
    const stream = createStream(mode);
    for (let i = 0; i < 30; i++) {
      expect(texts.has(stream.next().words.join(" "))).toBe(true);
    }
  });
});
