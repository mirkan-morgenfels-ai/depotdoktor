import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { SAMPLE_CSV_TRADEREPUBLIC } from "../sample";
import { buildReport } from "../report";
import { buildReportPdfData } from "../pdf-data";
import { buildTaxSummary, PROVISIONAL_PRICE_LABEL } from "../tax/summary";
import { defaultTaxYear, isRunningTaxYear, RUNNING_TAX_YEAR_LABEL, TAX_YEARS } from "../tax/year";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: "IE00TEST0001",
    name: "Testfonds Welt UCITS ETF",
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

const october2026 = new Date(2026, 9, 8, 12);
const buy2025 = tx({ id: "buy-2025", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" });
const buy2026 = tx({ id: "buy-2026", date: "2026-01-15", type: "buy", amount: "-550", shares: "5", price: "110" });
const sellAll2025 = tx({ id: "sell-2025", date: "2025-12-15", type: "sell", amount: "1050", shares: "10", price: "105" });

describe("Steuerjahre", () => {
  test("wählbar sind nur Jahre mit hinterlegtem Basiszins, neuestes zuerst: 2026, 2025", () => {
    expect(TAX_YEARS).toEqual([2026, 2025]);
  });

  test("ein Steuerjahr läuft, solange es nicht vor dem heutigen Jahr liegt: am 08.10.2026 läuft 2026, 2025 ist abgeschlossen", () => {
    expect(isRunningTaxYear(2026, october2026)).toBe(true);
    expect(isRunningTaxYear(2025, october2026)).toBe(false);
    expect(isRunningTaxYear(2026, new Date(2027, 0, 4))).toBe(false);
  });
});

describe("Vorbelegung des Steuerjahres", () => {
  test("Bestand am 31.12.2025 (Kauf im März 2025, Nachkauf 2026): am 08.10.2026 ist 2025 vorbelegt, das letzte abgeschlossene Jahr mit Bestand", () => {
    expect(defaultTaxYear([buy2025, buy2026], october2026)).toBe(2025);
  });

  test("Beispieldatei (alle Buchungen 2026, kein Bestand am 31.12.2025): 2026, das Jahr der letzten Depotbuchung", () => {
    const parsed = parseBrokerCsv(SAMPLE_CSV_TRADEREPUBLIC);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(defaultTaxYear(parsed.transactions, october2026)).toBe(2026);
  });

  test("Vollverkauf am 15.12.2025, Kauf 2026: kein Bestand am 31.12.2025, also 2026 als Jahr der letzten Depotbuchung", () => {
    expect(defaultTaxYear([buy2025, sellAll2025, buy2026], october2026)).toBe(2026);
  });

  test("Kauf und Vollverkauf 2025, danach keine Depotbuchung: 2025 als Jahr der letzten Depotbuchung", () => {
    expect(defaultTaxYear([buy2025, sellAll2025], october2026)).toBe(2025);
  });

  test("Kontobuchungen bestimmen die Vorbelegung nicht: Zinsen und Einzahlung 2026 nach Vollverkauf 2025 ergeben 2025", () => {
    const interest = tx({ id: "interest", date: "2026-04-01", type: "interest", amount: "3.21", isin: null, name: "Zinsen", assetClass: "cash" });
    const deposit = tx({ id: "deposit", date: "2026-05-01", type: "deposit", amount: "500", isin: null, name: "Einzahlung", assetClass: "cash" });
    expect(defaultTaxYear([buy2025, sellAll2025, interest, deposit], october2026)).toBe(2025);
  });

  test("am 04.01.2027 ist 2026 abgeschlossen: Bestand am 31.12.2026 ergibt 2026, obwohl es für 2027 noch keinen Basiszins gibt", () => {
    expect(defaultTaxYear([buy2026], new Date(2027, 0, 4))).toBe(2026);
  });

  test("letzte Depotbuchung nach dem neuesten Jahr mit Basiszins (Kauf Februar 2027, keine Bestände an früheren Jahresenden): 2026", () => {
    const buy2027 = tx({ id: "buy-2027", date: "2027-02-01", type: "buy", amount: "-130", shares: "1", price: "130" });
    expect(defaultTaxYear([buy2027], new Date(2027, 2, 1))).toBe(2026);
  });

  test("letzte Depotbuchung vor dem ältesten Jahr mit Basiszins (Kauf und Verkauf 2024): 2025", () => {
    const buy2024 = tx({ id: "buy-2024", date: "2024-02-01", type: "buy", amount: "-100", shares: "1", price: "100" });
    const sell2024 = tx({ id: "sell-2024", date: "2024-09-02", type: "sell", amount: "110", shares: "1", price: "110" });
    expect(defaultTaxYear([buy2024, sell2024], october2026)).toBe(2025);
  });

  test("Kauf 2023 ohne Verkauf: Bestand am 31.12.2025 ergibt 2025", () => {
    const buy2023 = tx({ id: "buy-2023", date: "2023-05-02", type: "buy", amount: "-100", shares: "1", price: "100" });
    expect(defaultTaxYear([buy2023], october2026)).toBe(2025);
  });

  test("PDF: Kachel Vorabpauschale nennt das laufende Steuerjahr („Steuerjahr läuft noch“), ein abgeschlossenes nicht", () => {
    const transactions = [buy2025, buy2026];
    const report = buildReport(transactions);
    const meta = { fileName: "test.csv", broker: "scalable" as const, transactionCount: 2, generatedAt: october2026 };
    const running = buildReportPdfData(report, buildTaxSummary(transactions, 2026), meta);
    expect(running.taxSummary[0]?.hint).toBe(`${PROVISIONAL_PRICE_LABEL} · ${RUNNING_TAX_YEAR_LABEL} · Basiszins 3,20 %`);
    const completed = buildReportPdfData(report, buildTaxSummary(transactions, 2025), meta);
    expect(completed.taxSummary[0]?.hint).not.toContain(RUNNING_TAX_YEAR_LABEL);
    const nextYear = buildReportPdfData(report, buildTaxSummary(transactions, 2026), { ...meta, generatedAt: new Date(2027, 0, 4) });
    expect(nextYear.taxSummary[0]?.hint).not.toContain(RUNNING_TAX_YEAR_LABEL);
  });

  test("ohne Depotbuchung (nur Einzahlung): neuestes Jahr 2026", () => {
    const deposit = tx({ id: "deposit", date: "2026-05-01", type: "deposit", amount: "500", isin: null, name: "Einzahlung", assetClass: "cash" });
    expect(defaultTaxYear([deposit], october2026)).toBe(2026);
    expect(defaultTaxYear([], october2026)).toBe(2026);
  });
});
