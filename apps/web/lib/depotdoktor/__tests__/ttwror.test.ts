import { describe, expect, test } from "vitest";
import { d } from "../money";
import { annualize, periodReturns, ttwror, type ValuationPoint } from "../metrics/ttwror";

function point(date: string, value: string, flow: string): ValuationPoint {
  return { date, value: d(value), flow: d(flow) };
}

describe("TTWROR", () => {
  test("Beispiel 1.3.1: zwei Perioden mit Zwischeneinzahlung ergeben 21 %", () => {
    const points = [
      point("2026-01-01", "10000", "10000"),
      point("2026-07-01", "16000", "5000"),
      point("2026-12-31", "17600", "0"),
    ];
    const result = ttwror(points);
    expect(result.periods.map((p) => p.rate.toFixed(4))).toEqual(["0.0000", "0.1000", "0.1000"]);
    expect(result.total?.toFixed(4)).toBe("0.2100");
  });

  test("Einzahlung ohne Kursänderung ergibt 0 %", () => {
    const points = [point("2026-01-01", "1000", "1000"), point("2026-02-01", "1500", "500")];
    expect(ttwror(points).total?.toFixed(6)).toBe("0.000000");
  });

  test("Entnahme wird nicht als Verlust gezählt", () => {
    const points = [point("2026-01-01", "1000", "1000"), point("2026-02-01", "600", "-400")];
    expect(ttwror(points).total?.toFixed(6)).toBe("0.000000");
  });

  test("Dividende als Abfluss erhöht die Rendite", () => {
    const points = [point("2026-01-01", "1000", "1000"), point("2026-02-01", "1000", "-20")];
    expect(ttwror(points).total?.toFixed(4)).toBe("0.0200");
  });

  test("Verlustperiode", () => {
    const points = [point("2026-01-01", "1000", "1000"), point("2026-02-01", "800", "0")];
    expect(ttwror(points).total?.toFixed(4)).toBe("-0.2000");
  });

  test("ein einzelner Kauf ohne Gebühr ergibt eine Periode mit 0 %", () => {
    const points = [point("2026-01-01", "1000", "1000")];
    const result = ttwror(points);
    expect(result.periods.map((p) => `${p.from} ${p.to} ${p.rate.toFixed(4)}`)).toEqual(["2026-01-01 2026-01-01 0.0000"]);
    expect(result.total?.toFixed(4)).toBe("0.0000");
  });

  test("Kaufgebühr des ersten Kaufs: Zufluss 1001 zu Periodenbeginn, Wert 1000, 1000/1001 − 1 = −0,0999 %", () => {
    const result = ttwror([point("2026-01-01", "1000", "1001")]);
    expect(result.total?.toFixed(6)).toBe(d(1000).div(1001).minus(1).toFixed(6));
    expect(result.total?.toFixed(6)).toBe("-0.000999");
  });

  test("Kauf ohne bekannten Kurs (Wert 0) ergibt keine Periode statt −100 %", () => {
    const result = ttwror([point("2026-01-01", "0", "800")]);
    expect(result.periods).toHaveLength(0);
    expect(result.total?.toFixed(4)).toBe("0.0000");
  });

  test("leere Serie ergibt null", () => {
    expect(ttwror([]).total).toBeNull();
  });

  test("Periode mit Startwert 0 und Zufluss beginnt mit dem Zufluss: Neukauf ohne Gebühr ergibt 0 %", () => {
    const points = [
      point("2026-01-01", "1000", "1000"),
      point("2026-02-01", "0", "-1100"),
      point("2026-03-01", "500", "500"),
      point("2026-04-01", "550", "0"),
    ];
    const result = periodReturns(points);
    expect(result.map((p) => `${p.from} ${p.to} ${p.rate.toFixed(4)}`)).toEqual([
      "2026-01-01 2026-01-01 0.0000",
      "2026-01-01 2026-02-01 0.1000",
      "2026-03-01 2026-03-01 0.0000",
      "2026-03-01 2026-04-01 0.1000",
    ]);
    expect(ttwror(points).total?.toFixed(4)).toBe("0.2100");
  });

  test("Periode mit Startwert 0 ohne Zufluss (Ausschüttung nach Vollverkauf) wird übersprungen", () => {
    const points = [point("2026-01-01", "1000", "1000"), point("2026-02-01", "0", "-1100"), point("2026-03-01", "0", "-5")];
    expect(periodReturns(points)).toHaveLength(2);
    expect(ttwror(points).total?.toFixed(4)).toBe("0.1000");
  });
});

describe("annualize", () => {
  test("21 % über zwei Jahre entsprechen 10 % p. a.", () => {
    expect(annualize(d("0.21"), 2)?.toFixed(4)).toBe("0.1000");
  });

  test("Totalverlust ergibt null", () => {
    expect(annualize(d("-1"), 2)).toBeNull();
  });
});
