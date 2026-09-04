import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { buildPortfolio } from "../portfolio";
import { buildReport } from "../report";
import { npv } from "../metrics/irr";

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

  test("Bewertungspunkte: ein Punkt je Buchungstag", () => {
    expect(snapshot.points.map((p) => `${p.date} ${p.value.toFixed(2)} ${p.flow.toFixed(2)}`)).toEqual([
      "2026-01-05 0.00 0.00",
      "2026-01-06 8000.00 8001.00",
      "2026-02-10 9000.00 1001.00",
      "2026-03-15 9000.00 -18.50",
      "2026-04-01 9000.00 0.00",
      "2026-06-20 8720.00 -479.00",
      "2026-07-19 8720.00 0.00",
      "2026-08-02 8720.00 0.00",
    ]);
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

  test("Cashflows für den IRR aus Anlegersicht plus Endwert", () => {
    expect(snapshot.cashflows.map((c) => c.amount)).toEqual([-8001, -1001, 18.5, 479, 8720]);
    expect(snapshot.cashflows[0]?.t).toBeCloseTo(1 / 365, 10);
  });
});

describe("buildReport mit Trade-Republic-Fixture", () => {
  const report = buildReport(fixtureTransactions("traderepublic-synthetic.csv"));

  test("TTWROR von Hand: 7999/8000 × 9018,5/9000 × 9199/9000 − 1 = 2,4084 %", () => {
    expect(report.ttwror.total?.toFixed(6)).toBe("0.024084");
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

  test("Max Drawdown entsteht nur aus dem Gebührenabzug beim ersten Nachkauf", () => {
    expect(report.drawdown.maxDrawdown.toFixed(6)).toBe("0.000125");
  });
});

describe("buildReport mit Scalable-Fixture liefert dieselben Kennzahlen bis auf Gebühren", () => {
  const report = buildReport(fixtureTransactions("scalable-synthetic.csv"));

  test("Endwert und Positionen stimmen überein", () => {
    expect(report.portfolio.totals.endValue.toFixed(2)).toBe("8720.00");
    expect(report.portfolio.positions).toHaveLength(2);
  });

  test("TTWROR von Hand: 7999,01/8000 × 9018,5/9000 × 9199,01/9000 − 1", () => {
    expect(report.ttwror.total?.toFixed(6)).toBe("0.024086");
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

  test("ein einzelner Kauf: TTWROR 0 %, IRR undefiniert", () => {
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
