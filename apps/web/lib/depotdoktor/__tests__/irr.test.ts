import { describe, expect, test } from "vitest";
import { irr, npv, npvDerivative } from "../metrics/irr";

const example = [
  { t: 0, amount: -10000 },
  { t: 1, amount: -5000 },
  { t: 2, amount: 17600 },
];

describe("NPV", () => {
  test("Beispiel 1.3.2: NPV(0,10) = 0 und NPV(0,08) = 459,53", () => {
    expect(npv(0.1, example)).toBeCloseTo(0, 6);
    expect(npv(0.08, example)).toBeCloseTo(459.53, 2);
  });

  test("Ableitung bei 8 %: 5.000/1,08² − 2·17.600/1,08³ = −23.656,20", () => {
    expect(npvDerivative(0.08, example)).toBeCloseTo(-23656.2, 1);
  });

  test("ein Newton-Schritt von 0,08 landet bei 0,0994", () => {
    const step = 0.08 - npv(0.08, example) / npvDerivative(0.08, example);
    expect(step).toBeCloseTo(0.0994, 4);
  });
});

describe("IRR", () => {
  test("Beispiel 1.3.2: IRR = 10 % vom Startwert 0,10", () => {
    const result = irr(example);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rate).toBeCloseTo(0.1, 8);
  });

  test("Newton vom Startwert 0,08 konvergiert auf 10 %", () => {
    const result = irr(example, { guess: 0.08 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rate).toBeCloseTo(0.1, 8);
    expect(result.method).toBe("newton");
  });

  test("einfache Verdopplung über ein Jahr ergibt 100 %", () => {
    const result = irr([
      { t: 0, amount: -100 },
      { t: 1, amount: 200 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rate).toBeCloseTo(1, 8);
  });

  test("Verlust: −1.000 heute, +900 nach einem Jahr ergibt −10 %", () => {
    const result = irr([
      { t: 0, amount: -1000 },
      { t: 1, amount: 900 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rate).toBeCloseTo(-0.1, 8);
  });

  test("nur Käufe ohne Rückfluss: IRR undefiniert", () => {
    const result = irr([
      { t: 0, amount: -100 },
      { t: 1, amount: -100 },
    ]);
    expect(result).toEqual({ ok: false, reason: "no-sign-change" });
  });

  test("alle Zahlungen am selben Tag: IRR undefiniert", () => {
    expect(
      irr([
        { t: 0, amount: -100 },
        { t: 0, amount: 100 },
      ]),
    ).toEqual({ ok: false, reason: "no-duration" });
  });

  test("keine Cashflows", () => {
    expect(irr([])).toEqual({ ok: false, reason: "no-cashflows" });
  });

  test("Bisektion als Fallback bei divergierendem Newton", () => {
    const flows = [
      { t: 0, amount: -1000 },
      { t: 0.01, amount: 3 },
      { t: 5, amount: 1500 },
    ];
    const result = irr(flows, { guess: 8 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(npv(result.rate, flows)).toBeCloseTo(0, 5);
    expect(result.rate).toBeCloseTo(Math.pow(1500 / 1000, 1 / 5) - 1, 2);
  });
});
