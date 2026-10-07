import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { buildPortfolio } from "../portfolio";
import { buildReport } from "../report";
import { npv } from "../metrics/irr";
import { d } from "../money";

function fixtureTransactions(name: string): Transaction[] {
  const path = fileURLToPath(new URL(`../../../../../packages/csv/fixtures/${name}`, import.meta.url));
  const result = parseBrokerCsv(readFileSync(path, "utf8"));
  if (!result.ok) throw new Error(result.error);
  return result.transactions;
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

describe("buildPortfolio mit Trade-Republic-Fixture", () => {
  const snapshot = buildPortfolio(fixtureTransactions("traderepublic-synthetic.csv"));

  test("Bewertungspunkte nur an Depotbuchungen: Einzahlung (05.01.), Zinsen (01.04.), Einbuchung ohne ISIN (19.07.) und Kartenzahlung (02.08.) entfallen", () => {
    expect(snapshot.points.map((p) => `${p.date} ${p.value.toFixed(2)} ${p.flow.toFixed(2)}`)).toEqual([
      "2026-01-06 8000.00 8001.00",
      "2026-02-10 9000.00 1001.00",
      "2026-03-15 9000.00 -18.50",
      "2026-06-20 8720.00 -479.00",
    ]);
  });

  test("Zeitraum vom ersten Kauf bis zur letzten Depotbuchung: 06.01.2026 bis 20.06.2026", () => {
    expect(snapshot.firstDate).toBe("2026-01-06");
    expect(snapshot.lastDate).toBe("2026-06-20");
  });

  test("offene Positionen mit letztem Kurs", () => {
    expect(snapshot.positions.map((p) => `${p.isin} ${p.shares.toString()} ${p.value.toFixed(2)}`)).toEqual([
      "IE00TEST0001 100 8000.00",
      "DE000TEST002 6 720.00",
    ]);
  });

  test("Summen", () => {
    expect(snapshot.totals.invested.toFixed(2)).toBe("9002.00");
    expect(snapshot.totals.proceeds.toFixed(2)).toBe("479.00");
    expect(snapshot.totals.dividends.toFixed(2)).toBe("18.50");
    expect(snapshot.totals.fees.toFixed(2)).toBe("3.00");
    expect(snapshot.totals.taxes.toFixed(2)).toBe("6.50");
    expect(snapshot.totals.deposits.toFixed(2)).toBe("10000.00");
    expect(snapshot.totals.withdrawals.toFixed(2)).toBe("42.17");
    expect(snapshot.totals.interest.toFixed(2)).toBe("3.21");
    expect(snapshot.totals.endValue.toFixed(2)).toBe("8720.00");
  });

  test("Cashflows für den IRR aus Anlegersicht plus Endwert, Zeit ab dem ersten Kauf", () => {
    expect(snapshot.cashflows.map((c) => c.amount)).toEqual([-8001, -1001, 18.5, 479, 8720]);
    expect(snapshot.cashflows.map((c) => Math.round(c.t * 365))).toEqual([0, 35, 68, 165, 165]);
  });

  test("Kontokennzahlen bleiben unverändert: Einzahlungen 10.000 €, Zinsen 3,21 €", () => {
    expect(snapshot.totals.deposits.toFixed(2)).toBe("10000.00");
    expect(snapshot.totals.interest.toFixed(2)).toBe("3.21");
  });
});

describe("buildReport mit Trade-Republic-Fixture", () => {
  const report = buildReport(fixtureTransactions("traderepublic-synthetic.csv"));

  test("TTWROR von Hand, Kaufgebühr des ersten Kaufs eingeschlossen: 8000/8001 × 7999/8000 × 9018,5/9000 × 9199/9000 − 1 = 2,3956 %", () => {
    const expected = d(8000).div(8001).times(d(7999).div(8000)).times(d("9018.5").div(9000)).times(d(9199).div(9000)).minus(1);
    expect(report.ttwror.total?.toFixed(6)).toBe(expected.toFixed(6));
    expect(report.ttwror.total?.toFixed(6)).toBe("0.023956");
  });

  test("IRR von Hand: NPV(5,5125 %) der Zahlungsströme −8001 (Tag 0), −1001 (Tag 35), +18,5 (Tag 68), +9199 (Tag 165) ist 0", () => {
    expect(report.irr.ok).toBe(true);
    if (!report.irr.ok) return;
    expect(report.irr.rate).toBeCloseTo(0.055125, 5);
  });

  test("Volatilität aus drei Perioden mit 35, 33 und 97 Tagen: 2,3191 % p. a.", () => {
    expect(report.volatility?.toFixed(6)).toBe("0.023191");
  });

  test("IRR löst NPV = 0", () => {
    expect(report.irr.ok).toBe(true);
    if (!report.irr.ok) return;
    expect(npv(report.irr.rate, report.portfolio.cashflows)).toBeCloseTo(0, 4);
    expect(report.irr.rate).toBeGreaterThan(0);
  });

  test("Allokation nach Assetklasse: ETF 91,74 %, Aktien 8,26 %", () => {
    expect(report.allocation.byAssetClass.map((s) => `${s.label} ${s.share.toFixed(4)}`)).toEqual([
      "ETF 0.9174",
      "Aktien 0.0826",
    ]);
  });

  test("Allokation nach Region über ISIN-Länderkennung", () => {
    expect(report.allocation.byRegion.map((s) => s.label)).toEqual(["Irland (Fondsdomizil)", "Deutschland"]);
  });

  test("Max Drawdown aus den Gebühren der beiden ersten Käufe: 1 − 8000/8001 × 7999/8000 = 1 − 7999/8001 = 0,025 %", () => {
    expect(report.drawdown.maxDrawdown.toFixed(6)).toBe(d(1).minus(d(7999).div(8001)).toFixed(6));
    expect(report.drawdown.maxDrawdown.toFixed(6)).toBe("0.000250");
    expect(report.drawdown.peakDate).toBe("2026-01-06");
    expect(report.drawdown.troughDate).toBe("2026-02-10");
  });
});

describe("buildReport mit Scalable-Fixture liefert dieselben Kennzahlen bis auf Gebühren", () => {
  const report = buildReport(fixtureTransactions("scalable-synthetic.csv"));
  const tradeRepublic = buildReport(fixtureTransactions("traderepublic-synthetic.csv"));

  test("Endwert und Positionen stimmen überein", () => {
    expect(report.portfolio.totals.endValue.toFixed(2)).toBe("8720.00");
    expect(report.portfolio.positions).toHaveLength(2);
  });

  test("TTWROR von Hand: 8000/8000,99 × 7999,01/8000 × 9018,5/9000 × 9199,01/9000 − 1", () => {
    const expected = d(8000).div("8000.99").times(d("7999.01").div(8000)).times(d("9018.5").div(9000)).times(d("9199.01").div(9000)).minus(1);
    expect(report.ttwror.total?.toFixed(6)).toBe(expected.toFixed(6));
    expect(report.ttwror.total?.toFixed(6)).toBe("0.023960");
  });

  test("derselbe Zeitraum 06.01.2026 bis 20.06.2026 wie bei Trade Republic, obwohl die Zinsbuchung am 01.07. liegt", () => {
    expect(report.portfolio.firstDate).toBe(tradeRepublic.portfolio.firstDate);
    expect(report.portfolio.lastDate).toBe(tradeRepublic.portfolio.lastDate);
    expect(report.portfolio.lastDate).toBe("2026-06-20");
  });

  test("IRR weicht höchstens 0,01 Prozentpunkte von Trade Republic ab", () => {
    expect(report.irr.ok && tradeRepublic.irr.ok).toBe(true);
    if (!report.irr.ok || !tradeRepublic.irr.ok) return;
    expect(Math.abs(report.irr.rate - tradeRepublic.irr.rate)).toBeLessThanOrEqual(0.0001);
  });
});

describe("Gebühren in der TTWROR (Zufluss zu Periodenbeginn)", () => {
  test("Kauf nach Vollverkauf: Gebühr des Neukaufs mindert die TTWROR, 1000/1001 × 1100/1000 × 500/501 × (660 − 110)/500 − 1", () => {
    const etf = { isin: "IE00TEST0001", name: "ETF" };
    const report = buildReport([
      tx({ id: "a", date: "2026-01-02", type: "buy", amount: "-1001", shares: "10", price: "100", fee: "1", ...etf }),
      tx({ id: "b", date: "2026-02-02", type: "sell", amount: "1100", shares: "10", price: "110", ...etf }),
      tx({ id: "c", date: "2026-03-02", type: "buy", amount: "-501", shares: "5", price: "100", fee: "1", ...etf }),
      tx({ id: "d", date: "2026-04-01", type: "buy", amount: "-110", shares: "1", price: "110", ...etf }),
    ]);
    expect(report.portfolio.points.map((p) => `${p.value.toFixed(2)} ${p.flow.toFixed(2)}`)).toEqual([
      "1000.00 1001.00",
      "0.00 -1100.00",
      "500.00 501.00",
      "660.00 110.00",
    ]);
    const expected = d(1000).div(1001).times(d(1100).div(1000)).times(d(500).div(501)).times(d(550).div(500)).minus(1);
    expect(report.ttwror.total?.toFixed(8)).toBe(expected.toFixed(8));
    expect(report.ttwror.periods.map((p) => p.rate.toFixed(6))).toEqual(["-0.000999", "0.100000", "-0.001996", "0.100000"]);
  });
});

describe("Grenzfälle", () => {
  test("leere Transaktionsliste", () => {
    const report = buildReport([]);
    expect(report.ttwror.total).toBeNull();
    expect(report.irr).toEqual({ ok: false, reason: "no-cashflows" });
    expect(report.portfolio.positions).toHaveLength(0);
    expect(report.allocation.byAssetClass).toHaveLength(0);
  });

  test("ein einzelner Kauf ohne Gebühr: TTWROR 0 %, IRR undefiniert", () => {
    const report = buildReport([
      tx({ date: "2026-01-06", type: "buy", amount: "-800", shares: "10", price: "80", isin: "IE00TEST0001", name: "ETF" }),
    ]);
    expect(report.ttwror.total?.toFixed(4)).toBe("0.0000");
    expect(report.irr).toEqual({ ok: false, reason: "no-duration" });
  });

  test("nur Käufe ohne Kurs: IRR undefiniert mit Hinweis", () => {
    const report = buildReport([
      tx({ date: "2026-01-06", type: "buy", amount: "-800", shares: "10", isin: "IE00TEST0001", name: "ETF" }),
    ]);
    expect(report.irr).toEqual({ ok: false, reason: "no-sign-change" });
    expect(report.notes.some((n) => n.includes("IRR nicht bestimmbar"))).toBe(true);
  });

  test("Verkauf über Bestand wird gemeldet und auf 0 gesetzt", () => {
    const report = buildReport([
      tx({ date: "2026-01-06", type: "buy", amount: "-800", shares: "10", price: "80", isin: "IE00TEST0001", name: "ETF" }),
      tx({ date: "2026-02-06", type: "sell", amount: "1200", shares: "15", price: "80", isin: "IE00TEST0001", name: "ETF" }),
    ]);
    expect(report.portfolio.positions).toHaveLength(0);
    expect(report.notes.some((n) => n.includes("unvollständig"))).toBe(true);
  });

  test("Verlustjahr: Kurs fällt von 80 auf 60", () => {
    const report = buildReport([
      tx({ date: "2026-01-06", type: "buy", amount: "-800", shares: "10", price: "80", isin: "IE00TEST0001", name: "ETF" }),
      tx({ date: "2026-12-06", type: "buy", amount: "-60", shares: "1", price: "60", isin: "IE00TEST0001", name: "ETF" }),
    ]);
    expect(report.ttwror.total?.toFixed(4)).toBe("-0.2500");
    expect(report.drawdown.maxDrawdown.toFixed(4)).toBe("0.2500");
  });
});
