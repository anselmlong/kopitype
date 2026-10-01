import { describe, expect, it } from "vitest";
import { kopiVerdict } from "./kopi";

describe("kopiVerdict", () => {
  it("gives no cup for an empty run", () => {
    expect(kopiVerdict(0)).toBeNull();
  });

  it("pours thicker as wpm climbs", () => {
    expect(kopiVerdict(12)?.cup).toBe("kopi po");
    expect(kopiVerdict(25)?.cup).toBe("kopi");
    expect(kopiVerdict(44)?.cup).toBe("kopi");
    expect(kopiVerdict(45)?.cup).toBe("kopi gau");
    expect(kopiVerdict(70)?.cup).toBe("kopi gau gau");
    expect(kopiVerdict(180)?.cup).toBe("kopi di lo");
  });

  it("orders a mistake-free run kosong", () => {
    expect(kopiVerdict(52, true)?.cup).toBe("kopi gau kosong");
    expect(kopiVerdict(52, false)?.cup).toBe("kopi gau");
    expect(kopiVerdict(0, true)).toBeNull();
  });
});
