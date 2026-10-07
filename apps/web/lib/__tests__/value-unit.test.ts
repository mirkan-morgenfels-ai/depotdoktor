import { describe, expect, it } from "vitest";
import { splitValueUnit } from "@portfolio/ui/value-unit";

describe("splitValueUnit", () => {
  it("separates percent and euro units without changing the text", () => {
    for (const [value, number, unit] of [
      ["+2,40\u00a0%", "+2,40", "\u00a0%"],
      ["−0,02\u00a0%", "−0,02", "\u00a0%"],
      ["2,32\u00a0% p. a.", "2,32", "\u00a0% p. a."],
      ["8.720,00\u00a0€", "8.720,00", "\u00a0€"],
      ["179,20 €", "179,20", " €"],
    ] as const) {
      const parts = splitValueUnit(value);
      expect(parts).toEqual({ number, unit });
      expect(`${parts?.number}${parts?.unit}`).toBe(value);
    }
  });

  it("leaves values without a trailing unit untouched", () => {
    expect(splitValueUnit("–")).toBeNull();
    expect(splitValueUnit("—")).toBeNull();
    expect(splitValueUnit("12")).toBeNull();
    expect(splitValueUnit("% 12")).toBeNull();
  });
});
