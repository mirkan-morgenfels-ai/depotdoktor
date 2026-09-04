import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { transactionsToCsv } from "../export-csv";
import { buildTaxSummary, defaultPositionSettings, parsePriceInput } from "../tax/summary";
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

  test("Semikolon und Anführungszeichen im Namen werden maskiert", () => {
    const tx = { ...transactions[1]!, name: 'Fonds "A"; Klasse B' };
    const out = transactionsToCsv([tx]).split("\r\n")[1]!;
    expect(out).toContain('"Fonds ""A""; Klasse B"');
  });
});

describe("Steuerzusammenfassung", () => {
  const transactions = fixtureTransactions("traderepublic-synthetic.csv");

  test("Standardeinstellungen: Aktie ohne Vorabpauschale, ETF als Aktienfonds, Kurs vorbelegt", () => {
    const positions = buildTaxPositions(transactions, 2026);
    const stock = defaultPositionSettings(positions[0]!);
    const etf = defaultPositionSettings(positions[1]!);
    expect(stock.fundType).toBe("none");
    expect(etf).toEqual({ fundType: "equity", yearStartPrice: "80,00", yearEndPrice: "80,00" });
  });

  test("Summen mit eingegebenem Jahresendkurs 95 € für den ETF", () => {
    const summary = buildTaxSummary(transactions, 2026, {
      IE00TEST0001: { fundType: "equity", yearStartPrice: "80,00", yearEndPrice: "95,00" },
    });
    expect(summary.rows).toHaveLength(2);
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("179.20");
    expect(summary.totals.taxable.toFixed(2)).toBe("125.44");
    expect(summary.totals.tax.toFixed(2)).toBe("33.08");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("78.60");
  });

  test("unlesbarer Kurs ergibt keine Schätzung für die Position", () => {
    const summary = buildTaxSummary(transactions, 2026, {
      IE00TEST0001: { fundType: "equity", yearStartPrice: "abc", yearEndPrice: "95,00" },
    });
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
  const summary = buildTaxSummary(transactions, 2026, {
    IE00TEST0001: { fundType: "equity", yearStartPrice: "80,00", yearEndPrice: "95,00" },
  });
  const data = buildReportPdfData(report, summary, {
    fileName: "test.csv",
    broker: "traderepublic",
    transactionCount: transactions.length,
    generatedAt: new Date(Date.UTC(2026, 8, 3)),
  });

  test("Kennzahlen, Tabellen und Disclaimer sind enthalten", () => {
    expect(data.metrics.find((m) => m.label === "TTWROR")?.value).toBe("+2,41\u00A0%");
    expect(data.valueTable.rows).toHaveLength(8);
    expect(data.taxTables.map((t) => t.title)).toEqual(["Musterwerk AG (DE000TEST002)", "Testfonds Welt UCITS ETF (IE00TEST0001)"]);
    expect(data.taxTables[1]?.rows.at(-1)?.cells.at(-1)).toBe("33,08\u00A0€");
    expect(data.disclaimer).toContain("keine Anlage- oder Steuerberatung");
    expect(data.generatedAt).toBe("03.09.2026");
  });

  test("keine Zeichen außerhalb von WinAnsi in Texten", () => {
    const texts = JSON.stringify(data);
    expect(texts).not.toMatch(/[\u2212\u2192\u202F\u2009]/);
    expect(d(1).toNumber()).toBe(1);
  });
});
