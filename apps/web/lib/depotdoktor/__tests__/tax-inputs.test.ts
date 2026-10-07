import { describe, expect, test } from "vitest";
import type { Transaction } from "@portfolio/csv";
import { EMPTY_TAX_INPUTS, taxInputsReducer, type TaxInputAction, type TaxInputs } from "../tax/inputs";
import { buildTaxSummary, type PositionSettings } from "../tax/summary";
import { buildReport } from "../report";
import { buildReportPdfData } from "../pdf-data";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: "IE00TEST0001",
    name: "Testfonds Welt UCITS ETF",
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

const KEY = "IE00TEST0001";

const transactions = [
  tx({ id: "buy-2025", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" }),
  tx({ id: "buy-2026", date: "2026-01-15", type: "buy", amount: "-550", shares: "5", price: "110" }),
];

function apply(...actions: TaxInputAction[]): TaxInputs {
  return actions.reduce(taxInputsReducer, EMPTY_TAX_INPUTS);
}

function price(year: number, field: "yearStartPrice" | "yearEndPrice", value: string, positionKey = KEY): TaxInputAction {
  return { type: "setPrice", year, positionKey, field, value };
}

function settingsFor(inputs: TaxInputs, year: number, list: readonly Transaction[] = transactions): PositionSettings[] {
  return buildTaxSummary(list, year, inputs).rows.map((r) => r.settings);
}

const entered2026 = [price(2026, "yearStartPrice", "105,00"), price(2026, "yearEndPrice", "125,00")];
const enteredBothYears = [...entered2026, price(2025, "yearEndPrice", "110,00")];

describe("Kurse je Steuerjahr und Position, Fondstyp je Position", () => {
  test("Vorbelegung je Jahr ohne Eingabe: 2025 letzter Kurs bis Ende 2025 = 100,00, 2026 letzter Kurs bis Ende 2026 = 110,00", () => {
    expect(settingsFor(EMPTY_TAX_INPUTS, 2025)).toEqual([{ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "100,00" }]);
    expect(settingsFor(EMPTY_TAX_INPUTS, 2026)).toEqual([{ fundType: "equity", yearStartPrice: "110,00", yearEndPrice: "110,00" }]);
  });

  test("Kurse für 2026 ändern die Vorbelegung 2025 nicht", () => {
    const inputs = apply(...entered2026);
    expect(settingsFor(inputs, 2026)).toEqual([{ fundType: "equity", yearStartPrice: "105,00", yearEndPrice: "125,00" }]);
    expect(settingsFor(inputs, 2025)).toEqual([{ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "100,00" }]);
    expect(inputs.prices[2025]).toBeUndefined();
  });

  test("Jahreswechsel behält die Eingaben beider Jahre; ein nicht eingegebenes Feld bleibt bei der Vorbelegung seines Jahres", () => {
    const inputs = apply(...enteredBothYears);
    expect(settingsFor(inputs, 2025)).toEqual([{ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "110,00" }]);
    expect(settingsFor(inputs, 2026)).toEqual([{ fundType: "equity", yearStartPrice: "105,00", yearEndPrice: "125,00" }]);
    expect(settingsFor(apply(...enteredBothYears, price(2025, "yearEndPrice", "112,00")), 2026)).toEqual(settingsFor(inputs, 2026));
  });

  test("Steuer 2026 aus den Kursen 2026: 10 × 105 × 3,2 % × 0,7 = 23,52 plus 5 × 105 × 3,2 % × 0,7 = 11,76, zusammen 35,28; × 0,7 = 24,696; × 26,375 % = 6,51357", () => {
    const summary = buildTaxSummary(transactions, 2026, apply(...enteredBothYears));
    const parts = summary.rows[0]!.estimate!.parts;
    expect(parts.map((p) => `${p.label} ${p.monthsBeforeAcquisition} ${p.result.vorabpauschale.toFixed(2)}`)).toEqual([
      "Bestand am Jahresanfang 0 23.52",
      "Kauf 2026-01-15 0 11.76",
    ]);
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("35.28");
    expect(summary.totals.taxable.toFixed(3)).toBe("24.696");
    expect(summary.totals.tax.toFixed(5)).toBe("6.51357");
  });

  test("Steuer 2025 aus den Kursen 2025: Kauf im März, 10 × 100 × 2,53 % × 0,7 × 10/12 = 14,7583; Zuwachs 10 × 10 = 100 deckelt nicht; × 0,7 = 10,3308; × 26,375 % = 2,7248", () => {
    const summary = buildTaxSummary(transactions, 2025, apply(...enteredBothYears));
    expect(summary.rows[0]!.estimate!.parts.map((p) => `${p.label} ${p.monthsBeforeAcquisition}`)).toEqual(["Kauf 2025-03-03 2"]);
    expect(summary.totals.vorabpauschale.toFixed(4)).toBe("14.7583");
    expect(summary.totals.taxable.toFixed(4)).toBe("10.3308");
    expect(summary.totals.tax.toFixed(4)).toBe("2.7248");
  });

  test("Vorbelegte Kurse ergeben in beiden Jahren 0 €, weil Kurs 01.01. und 31.12. gleich sind", () => {
    for (const year of [2025, 2026]) {
      expect(buildTaxSummary(transactions, year, EMPTY_TAX_INPUTS).totals.vorabpauschale.toFixed(2)).toBe("0.00");
    }
  });

  test("Fondstyp gilt für alle Jahre und schreibt die Kursvorbelegung keines Jahres fest", () => {
    const inputs = apply({ type: "setFundType", positionKey: KEY, fundType: "mixed" });
    expect(settingsFor(inputs, 2025)).toEqual([{ fundType: "mixed", yearStartPrice: "100,00", yearEndPrice: "100,00" }]);
    expect(settingsFor(inputs, 2026)).toEqual([{ fundType: "mixed", yearStartPrice: "110,00", yearEndPrice: "110,00" }]);
    expect(inputs.prices).toEqual({});
  });

  test("Mischfonds mit Kursen beider Jahre: 2026 35,28 × 0,85 = 29,988, Steuer 7,909335; 2025 14,7583 × 0,85 = 12,5446, Steuer 3,3086", () => {
    const inputs = apply(...enteredBothYears, { type: "setFundType", positionKey: KEY, fundType: "mixed" });
    const summary2026 = buildTaxSummary(transactions, 2026, inputs);
    expect(summary2026.totals.vorabpauschale.toFixed(2)).toBe("35.28");
    expect(summary2026.totals.taxable.toFixed(3)).toBe("29.988");
    expect(summary2026.totals.tax.toFixed(6)).toBe("7.909335");
    const summary2025 = buildTaxSummary(transactions, 2025, inputs);
    expect(summary2025.totals.taxable.toFixed(4)).toBe("12.5446");
    expect(summary2025.totals.tax.toFixed(4)).toBe("3.3086");
    expect(settingsFor(inputs, 2025)[0]?.yearEndPrice).toBe("110,00");
    expect(settingsFor(inputs, 2026)[0]?.yearEndPrice).toBe("125,00");
  });

  test("Geleertes Kursfeld bleibt leer und fällt nicht auf die Vorbelegung zurück, nur im betroffenen Jahr", () => {
    const inputs = apply(price(2026, "yearStartPrice", ""));
    const row2026 = buildTaxSummary(transactions, 2026, inputs).rows[0]!;
    expect(row2026.settings).toEqual({ fundType: "equity", yearStartPrice: "", yearEndPrice: "110,00" });
    expect(row2026.estimate).toBeNull();
    expect(settingsFor(inputs, 2025)).toEqual([{ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "100,00" }]);
  });

  test("Eingaben betreffen nur die eigene Position", () => {
    const withOther = [
      ...transactions,
      tx({ id: "buy-other", date: "2025-06-02", type: "buy", amount: "-500", shares: "10", price: "50", isin: "IE00TEST0002", name: "Zweitfonds" }),
    ];
    const inputs = apply(price(2026, "yearStartPrice", "105,00"), { type: "setFundType", positionKey: KEY, fundType: "none" });
    expect(settingsFor(inputs, 2026, withOther)).toEqual([
      { fundType: "none", yearStartPrice: "105,00", yearEndPrice: "110,00" },
      { fundType: "equity", yearStartPrice: "50,00", yearEndPrice: "50,00" },
    ]);
  });

  test("Reducer verändert den vorigen Zustand nicht; reset verwirft alle Eingaben", () => {
    const first = apply(price(2026, "yearStartPrice", "105,00"));
    const second = taxInputsReducer(first, price(2025, "yearEndPrice", "110,00"));
    expect(first.prices).toEqual({ 2026: { [KEY]: { yearStartPrice: "105,00" } } });
    expect(second.prices).toEqual({ 2025: { [KEY]: { yearEndPrice: "110,00" } }, 2026: { [KEY]: { yearStartPrice: "105,00" } } });
    expect(EMPTY_TAX_INPUTS).toEqual({ fundTypes: {}, prices: {} });
    expect(taxInputsReducer(second, { type: "reset" })).toBe(EMPTY_TAX_INPUTS);
  });

  test("PDF nutzt die Kurse und Summen des gewählten Jahres", () => {
    const inputs = apply(...enteredBothYears);
    const meta = { fileName: "test.csv", broker: "scalable" as const, transactionCount: transactions.length, generatedAt: new Date(Date.UTC(2026, 9, 7)) };
    const report = buildReport(transactions);
    const pdf2025 = buildReportPdfData(report, buildTaxSummary(transactions, 2025, inputs), meta);
    const pdf2026 = buildReportPdfData(report, buildTaxSummary(transactions, 2026, inputs), meta);
    expect(pdf2025.taxTables[0]?.footnote).toContain("Kurs 01.01.2025: 100,00 € · Kurs 31.12.2025: 110,00 €");
    expect(pdf2025.taxSummary[0]).toMatchObject({ label: "Vorabpauschale 2025", value: "14,76 €" });
    expect(pdf2026.taxTables[0]?.footnote).toContain("Kurs 01.01.2026: 105,00 € · Kurs 31.12.2026: 125,00 €");
    expect(pdf2026.taxSummary[0]).toMatchObject({ label: "Vorabpauschale 2026", value: "35,28 €" });
    expect(pdf2026.taxSummary[2]?.value).toBe("6,51 €");
  });

  test("Angesetzte Vorabpauschalen je Verkauf bleiben von Kurs- und Fondstypeingaben unberührt: 10 × (120 − 100) − 25,30 = 174,70", () => {
    const withSale = [
      tx({ id: "buy", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" }),
      tx({ id: "sell", date: "2026-05-04", type: "sell", amount: "1200", shares: "10", price: "120" }),
    ];
    const credits = { sell: "25,30" };
    const variants = [EMPTY_TAX_INPUTS, apply(...enteredBothYears), apply(...enteredBothYears, { type: "setFundType", positionKey: KEY, fundType: "mixed" })];
    for (const inputs of variants) {
      const sale = buildTaxSummary(withSale, 2026, inputs, credits).rows[0]!.sales[0]!;
      expect(sale.creditInput).toBe("25,30");
      expect(sale.gain.toFixed(2)).toBe("174.70");
    }
  });
});
