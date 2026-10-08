import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { CSV_HEADERS, csvDecimalCell, csvTextCell, transactionsToCsv } from "../export-csv";
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

const EXPECTED_HEADER =
  "Datum;Zeitstempel laut Export;Broker;Art;ISIN;Name;Kürzel;Assetklasse;Stück;Kurs;Betrag;Gebühr;Steuer;Währung;Buchungsart laut Export;Zeile im Export";

function readBack(csv: string): Papa.ParseResult<string[]> {
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  return Papa.parse<string[]>(csv.slice(1), { delimiter: ";", newline: "\r\n", skipEmptyLines: true });
}

describe("CSV-Export für deutsches Excel", () => {
  const transactions = fixtureTransactions("scalable-synthetic.csv");
  const base = transactions[1]!;
  const csv = transactionsToCsv(transactions);
  const lines = csv.split("\r\n");

  test("UTF-8-BOM genau einmal am Anfang (Bytes EF BB BF), danach deutsche Kopfzeile mit Semikolon", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.indexOf("\uFEFF", 1)).toBe(-1);
    expect([...new TextEncoder().encode(csv).subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(lines[0]).toBe(`\uFEFF${EXPECTED_HEADER}`);
    expect(CSV_HEADERS).toHaveLength(16);
  });

  test("Zeilenende CRLF nach jeder Zeile, auch nach der letzten; kein einzelnes CR oder LF", () => {
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(lines).toHaveLength(1 + transactions.length + 1);
    expect(lines.at(-1)).toBe("");
  });

  test("Kaufzeile: Datum TT.MM.JJJJ, deutsche Bezeichnungen, Dezimalkomma, Betrag −8.000,99 als -8000,99", () => {
    expect(lines[2]).toBe(
      "06.01.2026;2026-01-06T08:00:00;Scalable Capital;Kauf;IE00TEST0001;Testfonds Welt UCITS ETF;;Nicht zugeordnet;100;80;-8000,99;0,99;0;EUR;Buy;3",
    );
  });

  test("fehlende Werte ergeben leere Zellen (Einzahlung ohne ISIN, Stück und Kurs)", () => {
    expect(lines[1]).toBe("05.01.2026;2026-01-05T09:00:00;Scalable Capital;Einzahlung;;Einzahlung;;Cash;;;10000;0;0;EUR;Deposit;2");
  });

  test("Dezimalkomma ohne Tausenderpunkt, volle Genauigkeit ohne Rundung: -1234567.891234567 wird -1234567,891234567", () => {
    const tx = { ...base, shares: "0.000491", price: "1234567.891234", amount: "-1234567.891234567", fee: "1000", tax: "0.005" };
    const cells = readBack(transactionsToCsv([tx])).data[1]!;
    expect(cells.slice(8, 13)).toEqual(["0,000491", "1234567,891234", "-1234567,891234567", "1000", "0,005"]);
  });

  test("negatives Vorzeichen als ASCII-Bindestrich U+002D, nie als Minuszeichen U+2212", () => {
    const amount = readBack(csv).data[2]![10]!;
    expect(amount).toBe("-8000,99");
    expect(amount.charCodeAt(0)).toBe(0x2d);
    expect(csvDecimalCell("-42.17")).toBe("-42,17");
    expect(csv).not.toContain("\u2212");
  });

  test("Quoting: Semikolon, Anführungszeichen und Zeilenumbruch im Feld; Komma und Apostroph im Text ohne Anführungszeichen", () => {
    expect(csvTextCell('Fonds "A"; Klasse B')).toBe('"Fonds ""A""; Klasse B"');
    expect(csvTextCell("Zeile 1\nZeile 2")).toBe('"Zeile 1\nZeile 2"');
    expect(csvTextCell("Zeile 1\r\nZeile 2")).toBe('"Zeile 1\r\nZeile 2"');
    expect(csvTextCell('Fonds "A"')).toBe('"Fonds ""A"""');
    expect(csvTextCell("Fonds A, Klasse B")).toBe("Fonds A, Klasse B");
    expect(csvTextCell("O'Neil Fonds")).toBe("O'Neil Fonds");
    const name = 'Fonds "A"; Klasse B\r\nZweite Zeile';
    const parsed = readBack(transactionsToCsv([{ ...base, name }]));
    expect(parsed.errors).toEqual([]);
    expect(parsed.data).toHaveLength(2);
    expect(parsed.data[1]).toHaveLength(16);
    expect(parsed.data[1]![5]).toBe(name);
  });

  test("Injektionsschutz: Textfelder, die mit =, +, -, @, Tab oder CR beginnen, erhalten ein vorangestelltes Apostroph", () => {
    expect(csvTextCell("=1+1")).toBe("'=1+1");
    expect(csvTextCell("+49 30 1234")).toBe("'+49 30 1234");
    expect(csvTextCell("-Buy")).toBe("'-Buy");
    expect(csvTextCell("-5")).toBe("'-5");
    expect(csvTextCell("@SUMME(A1)")).toBe("'@SUMME(A1)");
    expect(csvTextCell("\t=1+1")).toBe("'\t=1+1");
    expect(csvTextCell("\r=1+1")).toBe("\"'\r=1+1\"");
    expect(csvTextCell("Fonds =A")).toBe("Fonds =A");
    expect(csvTextCell("A-B")).toBe("A-B");
    const tx = { ...base, name: "=HYPERLINK(1)", symbol: "+ABC", rawType: "@Buy", currency: "-EUR" };
    const cells = readBack(transactionsToCsv([tx])).data[1]!;
    expect(cells[5]).toBe("'=HYPERLINK(1)");
    expect(cells[6]).toBe("'+ABC");
    expect(cells[13]).toBe("'-EUR");
    expect(cells[14]).toBe("'@Buy");
  });

  test("Zahlenfelder ohne Apostroph; ein Wert, der keine Dezimalzahl ist, wird wie ein Textfeld entschärft", () => {
    const buyRow = readBack(csv).data[2]!;
    expect(buyRow.slice(8, 13)).toEqual(["100", "80", "-8000,99", "0,99", "0"]);
    expect(buyRow[15]).toBe("3");
    expect(csvDecimalCell("-8000.99")).toBe("-8000,99");
    expect(csvDecimalCell("0")).toBe("0");
    expect(csvDecimalCell(null)).toBe("");
    expect(csvDecimalCell("=1+1")).toBe("'=1+1");
    expect(csvDecimalCell("-1e5")).toBe("'-1e5");
  });

  describe("Beispieldatei (Trade Republic) wieder eingelesen", () => {
    const sample = fixtureTransactions("traderepublic-synthetic.csv");
    const sampleCsv = transactionsToCsv(sample);
    const parsed = readBack(sampleCsv);

    test("Papa Parse mit Semikolon: Kopfzeile plus 8 Zeilen, jede mit 16 Spalten, ohne Fehler", () => {
      expect(parsed.errors).toEqual([]);
      expect(parsed.data).toHaveLength(1 + 8);
      expect(parsed.data[0]).toEqual([...CSV_HEADERS]);
      for (const row of parsed.data) expect(row).toHaveLength(16);
    });

    test("Datum, Beträge und Quellzeile ergeben zurückgewandelt genau das Datenmodell", () => {
      sample.forEach((t, i) => {
        const row = parsed.data[i + 1]!;
        const [day, month, year] = row[0]!.split(".");
        expect(`${year}-${month}-${day}`).toBe(t.date);
        expect(row.slice(8, 13).map((cell) => (cell === "" ? null : cell.replace(",", ".")))).toEqual([t.shares, t.price, t.amount, t.fee, t.tax]);
        expect(Number(row[15])).toBe(t.rowIndex);
      });
    });

    test("Kartenzahlung mit -42,17 und Krypto-Einbuchung mit 0,000491 Stück", () => {
      expect(parsed.data[8]).toEqual([
        "02.08.2026",
        "2026-08-02T18:20:00.000Z",
        "Trade Republic",
        "Auszahlung",
        "",
        "Supermarkt",
        "",
        "Nicht zugeordnet",
        "",
        "",
        "-42,17",
        "0",
        "0",
        "EUR",
        "CARD/CARD_PAYMENT",
        "9",
      ]);
      expect(parsed.data[7]!.slice(3, 11)).toEqual(["Sonstiges", "", "Ethereum", "ETH", "Krypto", "0,000491", "", "0"]);
    });

    test("Papa Parse ohne Vorgabe erkennt das Semikolon als Trennzeichen trotz Dezimalkomma", () => {
      const guessed = Papa.parse<string[]>(sampleCsv.slice(1), { skipEmptyLines: true });
      expect(guessed.meta.delimiter).toBe(";");
      expect(guessed.data.every((row) => row.length === 16)).toBe(true);
    });
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
