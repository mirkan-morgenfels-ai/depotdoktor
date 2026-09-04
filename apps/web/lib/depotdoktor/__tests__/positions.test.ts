import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { d } from "../money";
import { buildTaxPositions, estimatePositionVorabpauschale } from "../tax/positions";

function fixtureTransactions(name: string): Transaction[] {
  const path = fileURLToPath(new URL(`../../../../../packages/csv/fixtures/${name}`, import.meta.url));
  const result = parseBrokerCsv(readFileSync(path, "utf8"));
  if (!result.ok) throw new Error(result.error);
  return result.transactions;
}

function tx(partial: Partial<Transaction> & Pick<Transaction, "date" | "type" | "amount">): Transaction {
  return {
    id: `${partial.date}-${partial.type}-${partial.isin ?? ""}`,
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

describe("buildTaxPositions 2026 aus Trade-Republic-Fixture", () => {
  const positions = buildTaxPositions(fixtureTransactions("traderepublic-synthetic.csv"), 2026);

  test("zwei Positionen, alphabetisch", () => {
    expect(positions.map((p) => p.name)).toEqual(["Musterwerk AG", "Testfonds Welt UCITS ETF"]);
  });

  test("ETF: ein unterjähriger Kauf im Januar, kein Bestand am Jahresanfang", () => {
    const etf = positions[1]!;
    expect(etf.sharesAtYearStart.toString()).toBe("0");
    expect(etf.lotsBoughtInYear.map((l) => `${l.month} ${l.shares.toString()} ${l.costPerShare.toFixed(2)}`)).toEqual(["1 100 80.01"]);
    expect(etf.sharesAtYearEnd.toString()).toBe("100");
  });

  test("Aktie: Kauf im Februar, Teilverkauf im Juni mit FIFO-Gewinn 479 − 4 × 100,10 = 78,60 €", () => {
    const stock = positions[0]!;
    expect(stock.lotsBoughtInYear.map((l) => `${l.month} ${l.shares.toString()}`)).toEqual(["2 6"]);
    expect(stock.salesInYear).toHaveLength(1);
    expect(stock.salesInYear[0]?.gain.toFixed(2)).toBe("78.60");
    expect(stock.distributionsInYear.toFixed(2)).toBe("18.50");
    expect(stock.lastKnownPrice?.toFixed(2)).toBe("120.00");
  });
});

describe("buildTaxPositions über Jahresgrenze", () => {
  const transactions = [
    tx({ date: "2025-03-01", type: "buy", amount: "-1600", shares: "20", price: "80", isin: "IE00TEST0001", name: "ETF" }),
    tx({ date: "2025-09-01", type: "sell", amount: "450", shares: "5", price: "90", isin: "IE00TEST0001", name: "ETF" }),
    tx({ date: "2026-07-15", type: "buy", amount: "-1000", shares: "10", price: "100", isin: "IE00TEST0001", name: "ETF" }),
    tx({ date: "2027-01-05", type: "buy", amount: "-100", shares: "1", price: "100", isin: "IE00TEST0001", name: "ETF" }),
  ];

  test("Bestand am 01.01.2026: 15 Anteile aus 2025, Kauf 2026 im Juli, Kauf 2027 ignoriert", () => {
    const [etf] = buildTaxPositions(transactions, 2026);
    expect(etf?.sharesAtYearStart.toString()).toBe("15");
    expect(etf?.lotsHeldAtYearStart.map((l) => l.shares.toString())).toEqual(["15"]);
    expect(etf?.lotsBoughtInYear.map((l) => `${l.month} ${l.shares.toString()}`)).toEqual(["7 10"]);
    expect(etf?.sharesAtYearEnd.toString()).toBe("25");
    expect(etf?.salesInYear).toHaveLength(0);
  });

  test("Jahr 2025: kein Anfangsbestand, Kauf im März, Verkauf im September", () => {
    const [etf] = buildTaxPositions(transactions, 2025);
    expect(etf?.sharesAtYearStart.toString()).toBe("0");
    expect(etf?.lotsBoughtInYear.map((l) => `${l.month} ${l.shares.toString()}`)).toEqual(["3 15"]);
    expect(etf?.salesInYear[0]?.gain.toFixed(2)).toBe("50.00");
  });

  test("Vorabpauschale 2026 für Bestand 15 @ 90 → 100 und Julikauf 10 Anteile", () => {
    const [etf] = buildTaxPositions(transactions, 2026);
    const estimate = estimatePositionVorabpauschale(etf!, 2026, "equity", { yearStartPrice: d(90), yearEndPrice: d(100) });
    expect(estimate).not.toBeNull();
    expect(estimate!.parts.map((p) => `${p.label} ${p.monthsBeforeAcquisition} ${p.result.basisertrag.toFixed(2)} ${p.result.vorabpauschale.toFixed(2)}`)).toEqual([
      "Bestand am Jahresanfang 0 30.24 30.24",
      "Kauf 2026-07-15 6 10.08 10.08",
    ]);
    expect(estimate!.vorabpauschale.toFixed(2)).toBe("40.32");
    expect(estimate!.taxable.toFixed(2)).toBe("28.22");
    expect(estimate!.tax.toFixed(2)).toBe("7.44");
  });

  test("Fondstyp „kein Fonds“ ergibt Vorabpauschale 0", () => {
    const [etf] = buildTaxPositions(transactions, 2026);
    const estimate = estimatePositionVorabpauschale(etf!, 2026, "none", { yearStartPrice: d(90), yearEndPrice: d(100) });
    expect(estimate?.parts).toEqual([]);
    expect(estimate?.tax.toFixed(2)).toBe("0.00");
  });

  test("Jahr ohne bekannten Basiszins ergibt null", () => {
    const [etf] = buildTaxPositions(transactions, 2025);
    expect(estimatePositionVorabpauschale(etf!, 2020, "equity", { yearStartPrice: d(1), yearEndPrice: d(2) })).toBeNull();
  });
});

describe("Grenzfälle", () => {
  test("leere Liste", () => {
    expect(buildTaxPositions([], 2026)).toEqual([]);
  });

  test("nur Einzahlungen ergeben keine Steuerpositionen", () => {
    expect(buildTaxPositions([tx({ date: "2026-01-01", type: "deposit", amount: "100" })], 2026)).toEqual([]);
  });
});
