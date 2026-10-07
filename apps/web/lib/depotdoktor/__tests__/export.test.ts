import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { transactionsToCsv } from "../export-csv";
import { buildTaxSummary, defaultPositionSettings, parsePriceInput } from "../tax/summary";
import type { TaxInputs } from "../tax/inputs";
import { buildTaxPositions } from "../tax/positions";
import { buildReport } from "../report";
import { buildReportPdfData } from "../pdf-data";
import { d } from "../money";

function fixtureTransactions(name: string): Transaction[] {
  const path = fileURLToPath(new URL(`../../../../../packages/csv/fixtures/${name}`, import.meta.url));
  const result = parseBrokerCsv(readFileSync(path, "utf8"));
  if (!result.ok) throw new Error(result.error);
  return result.transactions;
}

function etfPrices2026(yearStartPrice: string, yearEndPrice: string): TaxInputs {
  return { fundTypes: { IE00TEST0001: "equity" }, prices: { 2026: { IE00TEST0001: { yearStartPrice, yearEndPrice } } } };
}

describe("CSV-Export der normalisierten Transaktionen", () => {
  const transactions = fixtureTransactions("scalable-synthetic.csv");
  const csv = transactionsToCsv(transactions);
  const lines = csv.split("\r\n");

  test("BOM, Kopfzeile, eine Zeile je Transaktion", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe("\uFEFFdate;datetime;broker;type;isin;name;symbol;asset_class;shares;price;amount;fee;tax;currency;raw_type;source_row");
    expect(lines.filter((l) => l !== "")).toHaveLength(1 + transactions.length);
  });

  test("Kaufzeile mit Dezimalpunkt und Vorzeichen", () => {
    expect(lines[2]).toBe("2026-01-06;2026-01-06T08:00:00;scalable;buy;IE00TEST0001;Testfonds Welt UCITS ETF;;unknown;100;80;-8000.99;0.99;0;EUR;Buy;3");
  });

  test("Zellen, die wie Tabellenkalkulationsformeln beginnen, werden entschärft", () => {
    const tx = { ...transactions[1]!, name: "=HYPERLINK(https://example.org)", symbol: "+ABC", rawType: "-Buy" };
    const cells = transactionsToCsv([tx]).split("\r\n")[1]!.split(";");
    expect(cells[5]).toBe("'=HYPERLINK(https://example.org)");
    expect(cells[6]).toBe("'+ABC");
    expect(cells[14]).toBe("'-Buy");
    expect(cells[10]).toBe("-8000.99");
  });

  test("Semikolon und Anführungszeichen im Namen werden maskiert", () => {
    const tx = { ...transactions[1]!, name: 'Fonds "A"; Klasse B' };
    const out = transactionsToCsv([tx]).split("\r\n")[1]!;
    expect(out).toContain('"Fonds ""A""; Klasse B"');
  });
});

describe("Steuerzusammenfassung", () => {
  const transactions = fixtureTransactions("traderepublic-synthetic.csv");

  test("Standardeinstellungen: Aktie ohne Vorabpauschale, ETF als Aktienfonds, Kurs 01.01. ohne Vorjahreskurs leer, Kurs 31.12. vorbelegt", () => {
    const positions = buildTaxPositions(transactions, 2026);
    const stock = defaultPositionSettings(positions[0]!);
    const etf = defaultPositionSettings(positions[1]!);
    expect(stock.fundType).toBe("none");
    expect(etf).toEqual({ fundType: "equity", yearStartPrice: "", yearEndPrice: "80,00" });
  });

  test("Summen mit eingegebenem Jahresendkurs 95 € für den ETF", () => {
    const summary = buildTaxSummary(transactions, 2026, etfPrices2026("80,00", "95,00"));
    expect(summary.rows).toHaveLength(2);
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("179.20");
    expect(summary.totals.taxable.toFixed(2)).toBe("125.44");
    expect(summary.totals.tax.toFixed(2)).toBe("33.08");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("78.60");
  });

  test("unlesbarer Kurs ergibt keine Schätzung für die Position", () => {
    const summary = buildTaxSummary(transactions, 2026, etfPrices2026("abc", "95,00"));
    expect(summary.rows[1]?.estimate).toBeNull();
    expect(summary.totals.tax.toFixed(2)).toBe("0.00");
  });

  test("parsePriceInput akzeptiert Komma und Punkt", () => {
    expect(parsePriceInput("1.234,50")?.toFixed(2)).toBe("1234.50");
    expect(parsePriceInput("80")?.toFixed(2)).toBe("80.00");
    expect(parsePriceInput("")).toBeNull();
  });
});

describe("PDF-Daten", () => {
  const transactions = fixtureTransactions("traderepublic-synthetic.csv");
  const report = buildReport(transactions);
  const summary = buildTaxSummary(transactions, 2026, etfPrices2026("80,00", "95,00"));
  const data = buildReportPdfData(report, summary, {
    fileName: "test.csv",
    broker: "traderepublic",
    transactionCount: transactions.length,
    generatedAt: new Date(Date.UTC(2026, 8, 3)),
  });

  test("Kennzahlen, Tabellen und Disclaimer sind enthalten", () => {
    expect(data.metrics.find((m) => m.label === "TTWROR (kumuliert)")?.value).toBe("+2,40\u00A0%");
    expect(data.metrics.find((m) => m.label === "IRR (geldgewichtet, p. a.)")?.hint).toBe("bewertet zum letzten Kurs im Export, Stand 20.06.2026");
    expect(data.metricsNote).toContain("Der IRR p. a. hängt vom Endzeitpunkt ab.");
    expect(data.valueTable.rows).toHaveLength(4);
    expect(data.taxTables.map((t) => t.title)).toEqual(["Musterwerk AG (DE000TEST002)", "Testfonds Welt UCITS ETF (IE00TEST0001)"]);
    expect(data.taxTables[1]?.rows.at(-1)?.cells.at(-1)).toBe("33,08\u00A0€");
    expect(data.disclaimer).toContain("keine Anlage- oder Steuerberatung");
    expect(data.generatedAt).toBe("03.09.2026");
  });

  test("zwölf Kennzahlen wie in der Ansicht, Fußzeile mit Werkzeug-Adresse aus lib/site.ts", () => {
    expect(data.metrics.map((m) => m.label)).toEqual([
      "TTWROR (kumuliert)",
      "IRR (geldgewichtet, p. a.)",
      "Volatilität",
      "Max Drawdown",
      "Depotwert (letzter Kurs)",
      "Investiert (Käufe)",
      "Verkaufserlöse",
      "Dividenden netto",
      "Gebühren",
      "Abgeführte Steuern",
      "Einzahlungen Konto",
      "Zinsen Konto",
    ]);
    expect(data.metrics.slice(8).map((m) => m.value)).toEqual(["3,00\u00A0€", "6,50\u00A0€", "10.000,00\u00A0€", "3,21\u00A0€"]);
    expect(data.footerLine).toBe("Erstellt mit DepotDoktor · depotdoktor.vercel.app/projects/depotdoktor");
  });

  test("Quellzeile nennt übersprungene Zeilen, Hinweise zum Einlesen stehen unter den Hinweisen", () => {
    const scalable = fixtureTransactions("scalable-synthetic.csv");
    const withSkipped = buildReportPdfData(buildReport(scalable), buildTaxSummary(scalable, 2026), {
      fileName: "scalable.csv",
      broker: "scalable",
      transactionCount: scalable.length,
      skippedRows: 1,
      warnings: [{ rowIndex: 7, message: "Zeile 7: Status „Pending“, übersprungen." }],
      generatedAt: new Date(Date.UTC(2026, 9, 8)),
    });
    expect(withSkipped.sourceLine).toBe("scalable.csv · Scalable Capital · 6 Buchungen · 1 übersprungen · Zeitraum 06.01.2026 bis 20.06.2026");
    expect(withSkipped.notes).toContain("Einlesen: Zeile 7: Status „Pending“, übersprungen.");
    expect(data.sourceLine).not.toContain("übersprungen");
  });

  test("Steuertabelle mit Kurzkopf und Spaltenbreiten, die sich zu 1 summieren", () => {
    const etfTable = data.taxTables[1]!;
    expect(etfTable.columns).toEqual(["Anteil", "Stück", "Monate", "Basisertrag", "Vorabpausch.", "Steuerpfl.", "Steuer"]);
    expect(etfTable.widths?.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  test("keine Zeichen außerhalb von WinAnsi in Texten", () => {
    const texts = JSON.stringify(data);
    expect(texts).not.toMatch(/[\u2212\u2192\u202F\u2009]/);
    expect(d(1).toNumber()).toBe(1);
  });
});
