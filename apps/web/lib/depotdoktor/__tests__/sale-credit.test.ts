import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { d } from "../money";
import { createLot, fifoSell } from "../tax/fifo";
import { buildTaxPositions, type TaxSale } from "../tax/positions";
import type { FundType } from "../tax/constants";
import { EMPTY_TAX_INPUTS, type TaxInputs } from "../tax/inputs";
import { buildSaleRow, buildTaxSummary, defaultPositionSettings, parseCreditInput, type SaleCreditInputs } from "../tax/summary";
import { buildReport } from "../report";
import { buildReportPdfData } from "../pdf-data";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: "IE00TEST0001",
    name: "Testfonds",
    symbol: null,
    assetClass: "etf",
    shares: null,
    price: null,
    fee: "0",
    tax: "0",
    currency: "EUR",
    rawType: partial.type,
    ...partial,
  };
}

const transactions = [
  tx({ id: "buy-2025", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" }),
  tx({ id: "buy-2026", date: "2026-02-02", type: "buy", amount: "-1100", shares: "10", price: "110" }),
  tx({ id: "sell-2026", date: "2026-05-04", type: "sell", amount: "1800", shares: "15", price: "120" }),
];

function settings(fundType: FundType = "equity"): TaxInputs {
  return {
    fundTypes: { IE00TEST0001: fundType },
    prices: { 2026: { IE00TEST0001: { yearStartPrice: "110,00", yearEndPrice: "120,00" } } },
  };
}

function credits(credit: string): SaleCreditInputs {
  return { "sell-2026": credit };
}

describe("Angesetzte Vorabpauschalen beim Verkauf (§ 19 Abs. 1 Satz 3 und 4 InvStG)", () => {
  test("FIFO ohne Abzug: 10 × (120 − 100) + 5 × (120 − 110) = 250 €, Verkauf enthält Anteile aus 2025", () => {
    const [position] = buildTaxPositions(transactions, 2026);
    const sale = position!.salesInYear[0]!;
    expect(sale.id).toBe("sell-2026");
    expect(sale.date).toBe("2026-05-04");
    expect(sale.includesPriorYearLots).toBe(true);
    expect(sale.consumed.map((c) => `${c.lotId} ${c.shares.toString()} ${c.gain.toFixed(2)}`)).toEqual([
      "buy-2025 10 200.00",
      "buy-2026 5 50.00",
    ]);
    expect(sale.gain.toFixed(2)).toBe("250.00");
  });

  test("Eingabe 12,34 € mindert den Gewinn auf 250 − 12,34 = 237,66 €", () => {
    const summary = buildTaxSummary(transactions, 2026, settings(), credits("12,34"));
    const row = summary.rows[0]!;
    expect(row.sales[0]?.creditAllowed).toBe(true);
    expect(row.sales[0]?.credit.toFixed(2)).toBe("12.34");
    expect(row.sales[0]?.gain.toFixed(2)).toBe("237.66");
    expect(row.realizedGain.toFixed(2)).toBe("237.66");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("237.66");
  });

  test("ohne Eingabe wird nichts abgezogen", () => {
    const summary = buildTaxSummary(transactions, 2026, settings(), credits(""));
    expect(summary.rows[0]?.sales[0]?.creditValid).toBe(true);
    expect(summary.totals.realizedGain.toFixed(2)).toBe("250.00");
  });

  test("Tausenderpunkt: 1.234,50 € ergibt 250 − 1.234,50 = −984,50 €", () => {
    const summary = buildTaxSummary(transactions, 2026, settings(), credits("1.234,50"));
    expect(summary.rows[0]?.sales[0]?.gain.toFixed(2)).toBe("-984.50");
  });

  test("unlesbare oder negative Eingabe ist ungültig und zieht nichts ab", () => {
    for (const input of ["abc", "-5"]) {
      const sale = buildTaxSummary(transactions, 2026, settings(), credits(input)).rows[0]!.sales[0]!;
      expect(sale.creditValid).toBe(false);
      expect(sale.credit.toFixed(2)).toBe("0.00");
      expect(sale.gain.toFixed(2)).toBe("250.00");
    }
  });

  test("Fondstyp „kein Fonds“: keine Eingabe, kein Abzug", () => {
    const sale = buildTaxSummary(transactions, 2026, settings("none"), credits("12,34")).rows[0]!.sales[0]!;
    expect(sale.creditAllowed).toBe(false);
    expect(sale.gain.toFixed(2)).toBe("250.00");
  });

  test("Verkauf nur aus Anteilen desselben Jahres: keine Eingabe, kein Abzug", () => {
    const sameYear = [
      tx({ id: "buy", date: "2026-02-02", type: "buy", amount: "-1100", shares: "10", price: "110" }),
      tx({ id: "sell", date: "2026-05-04", type: "sell", amount: "600", shares: "5", price: "120" }),
    ];
    const summary = buildTaxSummary(sameYear, 2026, settings(), { sell: "10" });
    const sale = summary.rows[0]!.sales[0]!;
    expect(sale.sale.includesPriorYearLots).toBe(false);
    expect(sale.creditAllowed).toBe(false);
    expect(sale.gain.toFixed(2)).toBe("50.00");
  });

  test("Trade-Republic-Fixture: Aktienverkauf aus Februarkauf bleibt bei 78,60 €", () => {
    const path = fileURLToPath(new URL("../../../../../packages/csv/fixtures/traderepublic-synthetic.csv", import.meta.url));
    const parsed = parseBrokerCsv(readFileSync(path, "utf8"));
    if (!parsed.ok) throw new Error(parsed.error);
    const summary = buildTaxSummary(parsed.transactions, 2026);
    expect(summary.rows[0]?.sales[0]?.creditAllowed).toBe(false);
    expect(summary.totals.realizedGain.toFixed(2)).toBe("78.60");
  });

  test("parseCreditInput: leer ist 0, Komma und Punkt, negativ ungültig", () => {
    expect(parseCreditInput("")?.toFixed(2)).toBe("0.00");
    expect(parseCreditInput(" 7,5 ")?.toFixed(2)).toBe("7.50");
    expect(parseCreditInput("-0,01")).toBeNull();
  });

  test("PDF-Fußnote nennt den Abzug und den geminderten Gewinn", () => {
    const summary = buildTaxSummary(transactions, 2026, settings(), credits("12,34"));
    const data = buildReportPdfData(buildReport(transactions), summary, {
      fileName: "test.csv",
      broker: "scalable",
      transactionCount: transactions.length,
      generatedAt: new Date(Date.UTC(2026, 9, 6)),
    });
    expect(data.taxTables[0]?.footnote).toContain(
      "Verkauf 04.05.2026, 15 Stück: Erlös 1.800,00 €, Anschaffungskosten 1.550,00 €, angesetzte Vorabpauschalen 12,34 €, Gewinn 237,66 € (FIFO)",
    );
    expect(data.taxSummary.find((m) => m.label.startsWith("Realisierte Gewinne"))?.value).toBe("237,66 €");
  });

  test("Eingabe ändert die Positionseinstellungen nicht: 2025 bleibt bei Kurs 100,00, 2026 bei 120,00", () => {
    const entered = credits("12,34");
    const [position2025] = buildTaxPositions(transactions, 2025);
    const row2025 = buildTaxSummary(transactions, 2025, EMPTY_TAX_INPUTS, entered).rows[0]!;
    expect(row2025.settings).toEqual(defaultPositionSettings(position2025!));
    expect(row2025.settings).toEqual({ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "100,00" });
    expect(row2025.sales).toHaveLength(0);
    const row2026 = buildTaxSummary(transactions, 2026, EMPTY_TAX_INPUTS, entered).rows[0]!;
    expect(row2026.settings).toEqual({ fundType: "equity", yearStartPrice: "120,00", yearEndPrice: "120,00" });
    expect(row2026.sales[0]?.gain.toFixed(2)).toBe("237.66");
  });
});

describe("Anrechnung je Tranche und Eingabe ergeben eine Summe", () => {
  const taxedLots = [
    { ...createLot("buy-2025", "2025-03-03", d(10), d(1000)), taxedVorabpauschalePerShare: d("1.5") },
    createLot("buy-2026", "2026-02-02", d(10), d(1100)),
  ];
  const sale: TaxSale = {
    ...fifoSell(taxedLots, d(15), d(1800)),
    id: "sell-2026",
    date: "2026-05-04",
    includesPriorYearLots: true,
  };

  test("Tranche 10 × 1,50 = 15 €, Eingabe 12,34 €: angezeigt 27,34 €, Gewinn 1.800 − 1.550 − 27,34 = 222,66 €", () => {
    expect(sale.vorabpauschaleCredit.toFixed(2)).toBe("15.00");
    expect(sale.gainBeforeCredit.toFixed(2)).toBe("250.00");
    const row = buildSaleRow(sale, "equity", "12,34");
    expect(row.credit.toFixed(2)).toBe("27.34");
    expect(row.gain.toFixed(2)).toBe("222.66");
    expect(row.sale.proceeds.minus(row.sale.cost).minus(row.credit).toFixed(2)).toBe(row.gain.toFixed(2));
  });

  test("ohne gültige Eingabe bleibt nur die Tranche: 250 − 15 = 235 €", () => {
    for (const row of [buildSaleRow(sale, "equity", ""), buildSaleRow(sale, "equity", "abc"), buildSaleRow(sale, "none", "12,34")]) {
      expect(row.credit.toFixed(2)).toBe("15.00");
      expect(row.gain.toFixed(2)).toBe("235.00");
      expect(row.gain.toFixed(2)).toBe(sale.gain.toFixed(2));
    }
  });
});
