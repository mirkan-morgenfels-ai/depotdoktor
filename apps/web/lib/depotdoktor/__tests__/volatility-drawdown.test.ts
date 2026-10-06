import { describe, expect, test } from "vitest";
import type { Transaction } from "@portfolio/csv";
import { d } from "../money";
import { annualizedVolatility, sampleStdDev, volatilityFromPoints } from "../metrics/volatility";
import { maxDrawdown, maxDrawdownFromPoints } from "../metrics/drawdown";
import { ttwror, type ValuationPoint } from "../metrics/ttwror";
import { buildReport } from "../report";

function point(date: string, value: string, flow = "0"): ValuationPoint {
  return { date, value: d(value), flow: d(flow) };
}

function tx(partial: Partial<Transaction> & Pick<Transaction, "date" | "type" | "amount">): Transaction {
  return {
    id: `${partial.date}-${partial.type}`,
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: null,
    name: null,
    symbol: null,
    assetClass: "unknown",
    shares: null,
    price: null,
    fee: "0",
    tax: "0",
    currency: "EUR",
    rawType: partial.type,
    ...partial,
  };
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

describe("Max Drawdown nach Vollverkauf", () => {
  const afterFullSale = [
    point("2026-01-02", "1000", "1000"),
    point("2026-02-02", "0", "-1100"),
    point("2026-03-02", "450", "450"),
    point("2026-04-01", "405"),
  ];

  test("Index läuft über die Phase ohne Bestand weiter: 1 → 1,1 → 1,1 → 1,1 × 405/450 = 0,99, Drawdown 10 %", () => {
    const result = maxDrawdownFromPoints(afterFullSale);
    expect(result.maxDrawdown.toFixed(4)).toBe("0.1000");
    expect(result.peakDate).toBe("2026-02-02");
    expect(result.troughDate).toBe("2026-04-01");
  });

  test("Index entspricht der TTWROR-Verkettung: 1,1 × 0,9 − 1 = −1 %", () => {
    expect(ttwror(afterFullSale).total?.toFixed(4)).toBe("-0.0100");
  });

  test("Neukauf allein erzeugt keinen Drawdown (früher 1 − 1/1,1 = 9,09 % durch Rücksetzen des Index)", () => {
    const result = maxDrawdownFromPoints(afterFullSale.slice(0, 3));
    expect(result.maxDrawdown.toFixed(4)).toBe("0.0000");
  });

  test("Depotwert 0 nach Vollverkauf zählt nicht als −100 %: Verkauf mit 10 % Verlust, danach nur Ausschüttung", () => {
    const result = maxDrawdownFromPoints([
      point("2026-01-02", "1000", "1000"),
      point("2026-02-02", "0", "-900"),
      point("2026-03-02", "0", "-5"),
    ]);
    expect(result.maxDrawdown.toFixed(4)).toBe("0.1000");
    expect(result.troughDate).toBe("2026-02-02");
  });

  test("Verlust vor dem Vollverkauf bleibt erhalten: 0,8 × 400/500 = 0,64, Drawdown 36 % statt 20 %", () => {
    const result = maxDrawdownFromPoints([
      point("2026-01-02", "1000", "1000"),
      point("2026-02-02", "0", "-800"),
      point("2026-03-02", "500", "500"),
      point("2026-04-01", "400"),
    ]);
    expect(result.maxDrawdown.toFixed(4)).toBe("0.3600");
    expect(result.peakDate).toBe("2026-01-02");
    expect(result.troughDate).toBe("2026-04-01");
  });

  test("Bewertungspunkte ohne Bestand vor dem ersten Kauf werden übersprungen", () => {
    const result = maxDrawdownFromPoints([point("2026-01-01", "0"), point("2026-01-02", "1000", "1000"), point("2026-01-03", "900")]);
    expect(result.maxDrawdown.toFixed(4)).toBe("0.1000");
    expect(result.peakDate).toBe("2026-01-02");
  });

  test("über buildReport: Kauf 10 @ 100, Verkauf 10 @ 110, Kauf 5 @ 90, Kauf 1 @ 81 ergibt 10 %", () => {
    const etf = { isin: "IE00TEST0001", name: "ETF" };
    const report = buildReport([
      tx({ id: "a", date: "2026-01-02", type: "buy", amount: "-1000", shares: "10", price: "100", ...etf }),
      tx({ id: "b", date: "2026-02-02", type: "sell", amount: "1100", shares: "10", price: "110", ...etf }),
      tx({ id: "c", date: "2026-03-02", type: "buy", amount: "-450", shares: "5", price: "90", ...etf }),
      tx({ id: "d", date: "2026-04-01", type: "buy", amount: "-81", shares: "1", price: "81", ...etf }),
    ]);
    expect(report.portfolio.points.map((p) => `${p.value.toFixed(2)} ${p.flow.toFixed(2)}`)).toEqual([
      "1000.00 1000.00",
      "0.00 -1100.00",
      "450.00 450.00",
      "486.00 81.00",
    ]);
    expect(report.drawdown.maxDrawdown.toFixed(4)).toBe("0.1000");
    expect(report.ttwror.total?.toFixed(4)).toBe("-0.0100");
  });
});
