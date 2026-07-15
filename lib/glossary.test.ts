import { describe, expect, it } from "vitest";
import { glossaryLink, lookupGlossary, uniqueWords } from "./glossary";
import { parseWords, submissionUrl } from "./submit";

describe("glossary", () => {
  it("finds the terms the feature was asked for", () => {
    for (const w of ["paynow", "paylah", "mlbb", "bto", "hdb", "paywave", "lah", "shiok"]) {
      expect(lookupGlossary(w), w).not.toBeNull();
    }
  });

  it("misses politely", () => {
    expect(lookupGlossary("zebra")).toBeNull();
  });

  it("uses the entry link when present, wiktionary search otherwise", () => {
    const hdb = lookupGlossary("hdb")!;
    expect(glossaryLink("hdb", hdb)).toContain("wikipedia.org");
    const lah = lookupGlossary("lah")!;
    expect(glossaryLink("lah", lah)).toBe(
      "https://en.wiktionary.org/w/index.php?search=lah"
    );
  });

  it("uniqueWords keeps first-seen order and drops empties", () => {
    expect(uniqueWords(["lah", "kopi", "lah", "", "teh", "kopi"])).toEqual([
      "lah",
      "kopi",
      "teh",
    ]);
  });
});

describe("submissions", () => {
  it("parses word lists from messy input", () => {
    expect(parseWords(" PayNow, paylah\n mlbb  paynow ")).toEqual([
      "paynow",
      "paylah",
      "mlbb",
    ]);
  });

  it("builds a prefilled github issue url for words", () => {
    const url = submissionUrl({ kind: "words", content: "paynow paylah" })!;
    expect(url).toContain("github.com/anselmlong/kopitype/issues/new");
    const params = new URL(url).searchParams;
    expect(params.get("title")).toBe("corpus: paynow, paylah");
    expect(params.get("body")).toContain('"paynow"');
    expect(params.get("labels")).toBe("corpus-submission");
  });

  it("builds a quote submission with a default source", () => {
    const url = submissionUrl({ kind: "quote", content: "Eh   PAYNOW me leh" })!;
    const body = new URL(url).searchParams.get("body")!;
    expect(body).toContain('"text": "eh paynow me leh"');
    expect(body).toContain('"source": "daily life"');
  });

  it("returns null for empty submissions", () => {
    expect(submissionUrl({ kind: "words", content: "  ,  " })).toBeNull();
    expect(submissionUrl({ kind: "quote", content: "" })).toBeNull();
  });
});
