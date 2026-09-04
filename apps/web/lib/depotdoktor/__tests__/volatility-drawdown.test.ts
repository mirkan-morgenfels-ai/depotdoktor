import { describe, expect, test } from "vitest";
import { d } from "../money";
import { annualizedVolatility, sampleStdDev, volatilityFromPoints } from "../metrics/volatility";
import { maxDrawdown, maxDrawdownFromPoints } from "../metrics/drawdown";
import type { ValuationPoint } from "../metrics/ttwror";

function point(date: string, value: string, flow = "0"): ValuationPoint {
  return { date, value: d(value), flow: d(flow) };
}

describe("Volatilität", () => {
  test("Stichproben-Standardabweichung von 2 %, 0 %, −2 %, 4 % ist 2,5820 %", () => {
    const sd = sampleStdDev([d("0.02"), d("0"), d("-0.02"), d("0.04")]);
    expect(sd?.toFixed(6)).toBe("0.025820");
  });

  test("Beispiel 1.3.3: Tagesvolatilität 1,03 % annualisiert ergibt 16,4 %", () => {
    const daily = d("0.0103");
    const annual = daily.times(d(252).sqrt());
    expect(annual.toFixed(3)).toBe("0.164");
  });

  test("annualisierte Volatilität aus Tagesrenditen mit √252", () => {
    const returns = [d("0.02"), d("0"), d("-0.02"), d("0.04")];
    const vol = annualizedVolatility(returns);
    expect(vol?.toFixed(4)).toBe("0.4099");
  });

  test("weniger als zwei Renditen ergeben null", () => {
    expect(annualizedVolatility([d("0.01")])).toBeNull();
    expect(annualizedVolatility([])).toBeNull();
  });

  test("Bewertungspunkte im Abstand von einem Handelstag entsprechen der Tagesformel", () => {
    const points = [
      point("2026-03-02", "1000"),
      point("2026-03-03", "1020"),
      point("2026-03-04", "1020"),
      point("2026-03-05", "999.6"),
      point("2026-03-06", "1039.584"),
    ];
    const vol = volatilityFromPoints(points);
    const reference = annualizedVolatility([d("0.02"), d("0"), d("-0.02"), d("0.04")], 365);
    expect(vol?.toFixed(4)).toBe(reference?.toFixed(4));
  });
});

describe("Max Drawdown", () => {
  test("Beispiel 1.3.3: Höchststand 12.000, Tiefpunkt 9.348 ergibt 22,1 %", () => {
    const mdd = maxDrawdown([d("10000"), d("12000"), d("9348"), d("11000")]);
    expect(mdd.toFixed(3)).toBe("0.221");
  });

  test("monoton steigende Werte ergeben 0", () => {
    expect(maxDrawdown([d("1"), d("2"), d("3")]).toFixed(2)).toBe("0.00");
  });

  test("leere Serie ergibt 0", () => {
    expect(maxDrawdown([]).toFixed(2)).toBe("0.00");
  });

  test("Entnahme zählt nicht als Drawdown, Kursverlust schon", () => {
    const points = [
      point("2026-01-01", "12000", "12000"),
      point("2026-02-01", "6000", "-6000"),
      point("2026-03-01", "4674"),
    ];
    const result = maxDrawdownFromPoints(points);
    expect(result.maxDrawdown.toFixed(3)).toBe("0.221");
    expect(result.peakDate).toBe("2026-01-01");
    expect(result.troughDate).toBe("2026-03-01");
  });
});
