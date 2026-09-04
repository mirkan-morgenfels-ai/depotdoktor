import { describe, expect, test } from "vitest";
import { applySignConvention, normalizeIsin, parseDate, parseDecimal } from "../normalize";

describe("parseDecimal", () => {
  test("Dezimalpunkt (Trade Republic)", () => {
    expect(parseDecimal("0.0004910000", "point")).toBe("0.000491");
    expect(parseDecimal("-8001.00", "point")).toBe("-8001");
    expect(parseDecimal("1,234.56", "point")).toBe("1234.56");
  });

  test("Dezimalkomma (Scalable Capital)", () => {
    expect(parseDecimal("7,34", "comma")).toBe("7.34");
    expect(parseDecimal("-587,20", "comma")).toBe("-587.2");
    expect(parseDecimal("1.234,56", "comma")).toBe("1234.56");
    expect(parseDecimal("80", "comma")).toBe("80");
  });

  test("leere und unlesbare Werte", () => {
    expect(parseDecimal("", "point")).toBeNull();
    expect(parseDecimal("  ", "comma")).toBeNull();
    expect(parseDecimal("abc", "point")).toBeNull();
    expect(parseDecimal(undefined, "point")).toBeNull();
  });

  test("Währungssuffix wird entfernt", () => {
    expect(parseDecimal("-42,17 EUR", "comma")).toBe("-42.17");
  });
});

describe("parseDate", () => {
  test("ISO-Datum und ISO-Datetime", () => {
    expect(parseDate("2026-01-19")).toBe("2026-01-19");
    expect(parseDate("2026-01-19T13:31:47.160Z")).toBe("2026-01-19");
  });

  test("deutsches Datum", () => {
    expect(parseDate("19.01.2026")).toBe("2026-01-19");
  });

  test("ungültiges Datum", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("gestern")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("normalizeIsin", () => {
  test("gültige ISIN", () => {
    expect(normalizeIsin("us9168961038")).toBe("US9168961038");
  });
  test("ungültige ISIN", () => {
    expect(normalizeIsin("ETH")).toBeNull();
    expect(normalizeIsin("")).toBeNull();
  });
});

describe("applySignConvention", () => {
  test("Kauf ist Geldabfluss, Verkauf Geldzufluss", () => {
    expect(applySignConvention("buy", "587.2")).toBe("-587.2");
    expect(applySignConvention("buy", "-587.2")).toBe("-587.2");
    expect(applySignConvention("sell", "-479")).toBe("479");
    expect(applySignConvention("dividend", "18.5")).toBe("18.5");
    expect(applySignConvention("fee", "0.99")).toBe("-0.99");
  });
  test("unbekannte Buchungsart behält Vorzeichen", () => {
    expect(applySignConvention("other", "-42.17")).toBe("-42.17");
  });
});
