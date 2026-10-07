import { describe, expect, test } from "vitest";
import type { Transaction } from "@portfolio/csv";
import { EMPTY_TAX_INPUTS, taxInputsReducer, type TaxInputAction, type TaxInputs } from "../tax/inputs";
import { buildTaxPositions } from "../tax/positions";
import { buildTaxSummary, defaultPositionSettings } from "../tax/summary";
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

const KEY = "IE00TEST0001";
const buy2025 = tx({ id: "buy-2025", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" });
const buy2026 = tx({ id: "buy-2026", date: "2026-01-15", type: "buy", amount: "-550", shares: "5", price: "110" });
const twoYears = [buy2025, buy2026];

function apply(...actions: TaxInputAction[]): TaxInputs {
  return actions.reduce(taxInputsReducer, EMPTY_TAX_INPUTS);
}

function price(year: number, field: "yearStartPrice" | "yearEndPrice", value: string): TaxInputAction {
  return { type: "setPrice", year, positionKey: KEY, field, value };
}

describe("Vorbelegung der Kurse je Steuerjahr", () => {
  test("mit Vorjahreskurs: Kurs 01.01.2026 = letzter Kurs bis 31.12.2025 (100,00), Kurs 31.12.2026 = letzter Kurs bis 31.12.2026 (110,00)", () => {
    const [position] = buildTaxPositions(twoYears, 2026);
    expect(position?.priceBeforeYear?.toFixed(2)).toBe("100.00");
    expect(position?.priceBeforeYearDate).toBe("2025-03-03");
    expect(defaultPositionSettings(position!)).toEqual({ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "110,00" });
  });

  test("ohne Vorjahreskurs: Kurs 01.01.2025 bleibt leer, Kurs 31.12.2025 = 100,00 aus dem März", () => {
    const [position] = buildTaxPositions(twoYears, 2025);
    expect(position?.priceBeforeYear).toBeNull();
    expect(defaultPositionSettings(position!)).toEqual({ fundType: "equity", yearStartPrice: "", yearEndPrice: "100,00" });
  });

  test("Kurs 01.01. stammt nie aus dem laufenden Jahr: Kauf im Januar 2026 belegt nur Kurs 31.12.2026 vor", () => {
    const [position] = buildTaxPositions([buy2026], 2026);
    expect(defaultPositionSettings(position!)).toEqual({ fundType: "equity", yearStartPrice: "", yearEndPrice: "110,00" });
  });

  test("Kurs 31.12. nutzt keine Kurse aus Folgejahren", () => {
    const later = tx({ id: "buy-2027", date: "2027-02-01", type: "buy", amount: "-130", shares: "1", price: "130" });
    const [position] = buildTaxPositions([...twoYears, later], 2026);
    expect(defaultPositionSettings(position!).yearEndPrice).toBe("110,00");
  });
});

describe("Steuerkacheln ohne Schein-Ergebnis", () => {
  test("fehlender Kurs 01.01.: keine Schätzung, Status 'missing', keine Summe als Ergebnis", () => {
    const summary = buildTaxSummary(twoYears, 2025);
    expect(summary.rows[0]?.estimate).toBeNull();
    expect(summary.rows[0]?.status).toBe("missing");
    expect(summary.totals.status).toBe("missing");
  });

  test("beide Kurse unverändert aus derselben Buchung (Kauf 2025, kein Kurs 2026): keine Schätzung statt 0,00 €", () => {
    const summary = buildTaxSummary([buy2025], 2026);
    const row = summary.rows[0]!;
    expect(row.settings).toEqual({ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "100,00" });
    expect(row.sameSourcePrefill).toBe(true);
    expect(row.estimate).toBeNull();
    expect(row.status).toBe("missing");
    expect(summary.totals.status).toBe("missing");
  });

  test("derselbe Kurs, aber eingegeben: Schätzung 0 € ist dann ein echtes Ergebnis", () => {
    const summary = buildTaxSummary([buy2025], 2026, apply(price(2026, "yearStartPrice", "100,00"), price(2026, "yearEndPrice", "100,00")));
    expect(summary.rows[0]?.status).toBe("complete");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("0.00");
  });

  test("vorbelegte Kurse aus verschiedenen Buchungen sind vorläufig: 10 × 100 × 3,2 % × 0,7 = 22,40 plus 5 × 100 × 3,2 % × 0,7 = 11,20, zusammen 33,60; × 0,7 = 23,52; × 26,375 % = 6,2034", () => {
    const summary = buildTaxSummary(twoYears, 2026);
    const row = summary.rows[0]!;
    expect(row.prefilled).toEqual({ yearStartPrice: true, yearEndPrice: true });
    expect(row.sameSourcePrefill).toBe(false);
    expect(row.status).toBe("provisional");
    expect(summary.totals.status).toBe("provisional");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("33.60");
    expect(summary.totals.taxable.toFixed(2)).toBe("23.52");
    expect(summary.totals.tax.toFixed(4)).toBe("6.2034");
  });

  test("ein eingegebener und ein vorbelegter Kurs bleiben vorläufig, zwei eingegebene sind vollständig", () => {
    expect(buildTaxSummary(twoYears, 2026, apply(price(2026, "yearEndPrice", "125,00"))).rows[0]?.status).toBe("provisional");
    const both = buildTaxSummary(twoYears, 2026, apply(price(2026, "yearStartPrice", "105,00"), price(2026, "yearEndPrice", "125,00")));
    expect(both.rows[0]?.prefilled).toEqual({ yearStartPrice: false, yearEndPrice: false });
    expect(both.rows[0]?.status).toBe("complete");
    expect(both.totals.status).toBe("complete");
    expect(both.totals.vorabpauschale.toFixed(2)).toBe("35.28");
  });

  test("Fondstyp 'kein Fonds' braucht keine Kurse: Status 'notApplicable', Summe 0 € ist vollständig", () => {
    const summary = buildTaxSummary([buy2026], 2026, apply({ type: "setFundType", positionKey: KEY, fundType: "none" }));
    expect(summary.rows[0]?.status).toBe("notApplicable");
    expect(summary.rows[0]?.estimate?.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(summary.totals.status).toBe("complete");
  });

  test("PDF zeigt bei fehlenden Kursen '–' und 'Kurse eintragen' statt 0,00 €", () => {
    const meta = { fileName: "test.csv", broker: "scalable" as const, transactionCount: 1, generatedAt: new Date(Date.UTC(2026, 9, 8)) };
    const data = buildReportPdfData(buildReport([buy2025]), buildTaxSummary([buy2025], 2026), meta);
    for (const metric of data.taxSummary.slice(0, 3)) {
      expect(metric.value).toBe("–");
      expect(metric.hint).toContain("Kurse eintragen");
    }
    expect(JSON.stringify(data.taxSummary.slice(0, 3))).not.toContain("0,00");
  });

  test("PDF kennzeichnet vorbelegte Kurse als vorläufig", () => {
    const meta = { fileName: "test.csv", broker: "scalable" as const, transactionCount: 2, generatedAt: new Date(Date.UTC(2026, 9, 8)) };
    const data = buildReportPdfData(buildReport(twoYears), buildTaxSummary(twoYears, 2026), meta);
    expect(data.taxSummary[0]?.value).toBe("33,60 €");
    expect(data.taxSummary[0]?.hint).toContain("vorläufig (Kurs aus dem Export)");
    expect(data.taxTables[0]?.footnote).toContain("Kurs 01.01.2026: 100,00 € (vorläufig, Kurs aus dem Export)");
  });
});

describe("Kein Bestand am 31.12.: keine Vorabpauschale (§ 18 Abs. 3 InvStG)", () => {
  const meta = { fileName: "test.csv", broker: "scalable" as const, transactionCount: 2, generatedAt: new Date(Date.UTC(2026, 9, 8)) };
  const buyFeb = tx({ id: "buy-feb", date: "2026-02-10", type: "buy", amount: "-1000", shares: "10", price: "100" });
  const sellMay = tx({ id: "sell-may", date: "2026-05-20", type: "sell", amount: "1100", shares: "10", price: "110" });

  test("Kauf 10 @ 100 am 10.02.2026, Verkauf 10 @ 110 am 20.05.2026: keine Kurse nötig, Vorabpauschale 0,00 €, Gewinn 10 × (110 − 100) = 100,00 €", () => {
    const summary = buildTaxSummary([buyFeb, sellMay], 2026);
    const row = summary.rows[0]!;
    expect(row.settings.yearStartPrice).toBe("");
    expect(row.heldAtYearEnd).toBe(false);
    expect(row.status).toBe("notApplicable");
    expect(row.estimate?.parts).toEqual([]);
    expect(row.estimate?.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("100.00");
  });

  test("daneben ein Fonds aus 2025 mit Nachkauf im Mai: Kacheln zeigen dessen vorläufiges Ergebnis 10 × 100 × 3,2 % × 0,7 = 22,40 plus 1 × 100 × 3,2 % × 0,7 × 8/12 = 1,4933, zusammen 23,89 €", () => {
    const old = { isin: "IE00TEST0002", name: "Alt-ETF" };
    const transactions = [
      tx({ id: "old-2025", date: "2025-02-03", type: "buy", amount: "-1000", shares: "10", price: "100", ...old }),
      buyFeb,
      sellMay,
      tx({ id: "old-2026", date: "2026-05-21", type: "buy", amount: "-110", shares: "1", price: "110", ...old }),
    ];
    const summary = buildTaxSummary(transactions, 2026);
    expect(summary.rows.map((r) => `${r.position.name} ${r.status}`)).toEqual(["Alt-ETF provisional", "Testfonds Welt UCITS ETF notApplicable"]);
    expect(summary.totals.status).toBe("provisional");
    expect(summary.totals.vorabpauschale.toFixed(4)).toBe("23.8933");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("100.00");
  });

  test("Bestand aus 2025 im Jahr 2026 ganz verkauft: nicht vorläufig, sondern ohne Vorabpauschale; Gewinn 10 × (120 − 100) = 200,00 €", () => {
    const sellAll = tx({ id: "sell-all", date: "2026-05-04", type: "sell", amount: "1200", shares: "10", price: "120" });
    const summary = buildTaxSummary([buy2025, sellAll], 2026);
    const row = summary.rows[0]!;
    expect(row.settings).toEqual({ fundType: "equity", yearStartPrice: "100,00", yearEndPrice: "120,00" });
    expect(row.status).toBe("notApplicable");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("200.00");
  });

  test("PDF nennt den fehlenden Bestand statt 'Kurse eintragen' und kennzeichnet keine Kurse als vorläufig", () => {
    const data = buildReportPdfData(buildReport([buyFeb, sellMay]), buildTaxSummary([buyFeb, sellMay], 2026), meta);
    expect(data.taxSummary[0]?.value).toBe("0,00 €");
    expect(data.taxSummary[0]?.hint).not.toContain("Kurse eintragen");
    expect(data.taxTables[0]?.rows.map((r) => r.cells)).toEqual([
      ["Keine Vorabpauschale: kein Bestand am 31.12.2026 (§ 18 Abs. 3 InvStG)."],
    ]);
    expect(data.taxTables[0]?.footnote).not.toContain("vorläufig");
  });
});
