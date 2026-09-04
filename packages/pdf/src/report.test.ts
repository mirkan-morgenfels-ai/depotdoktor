import { describe, expect, test } from "vitest";
import { PDFParse } from "pdf-parse";
import { renderReportPdfBuffer } from "./index";
import type { ReportPdfData } from "./types";

const sample: ReportPdfData = {
  title: "Depot-Report",
  subtitle: "Performance, Allokation und geschätzte Vorabpauschale 2026",
  generatedAt: "03.09.2026",
  sourceLine: "test.csv · Trade Republic · 8 Buchungen",
  metrics: [
    { label: "TTWROR", value: "+2,41 %", hint: "06.01.2026 bis 02.08.2026" },
    { label: "IRR (geldgewichtet)", value: "+5,17 % p. a." },
  ],
  valueTable: {
    title: "Wertverlauf an den Buchungstagen",
    columns: ["Datum", "Depotwert", "Zahlungsstrom", "Periodenrendite"],
    rows: [{ cells: ["06.01.2026", "8.000,00 €", "8.001,00 €", "–"] }],
  },
  positionsTable: {
    title: "Offene Positionen",
    columns: ["Name", "ISIN", "Stück", "Wert"],
    rows: [{ cells: ["Testfonds Welt UCITS ETF", "IE00TEST0001", "100", "8.000,00 €"] }],
  },
  allocationTables: [{ title: "Nach Assetklasse", columns: ["Gruppe", "Anteil", "Wert"], rows: [{ cells: ["ETF", "91,74 %", "8.000,00 €"] }] }],
  taxSummary: [{ label: "Vorabpauschale 2026", value: "179,20 €" }],
  taxTables: [
    {
      title: "Testfonds Welt UCITS ETF (IE00TEST0001)",
      columns: ["Anteil", "Stück", "Basisertrag", "Vorabpauschale", "Steuer"],
      rows: [
        { cells: ["Kauf 06.01.2026", "100", "179,20 €", "179,20 €", "33,08 €"] },
        { cells: ["Summe", "", "", "179,20 €", "33,08 €"], emphasis: true },
      ],
      footnote: "Aktienfonds (Teilfreistellung 30 %)",
    },
  ],
  taxMethod: ["Basisertrag = Wert am Jahresanfang × Basiszins × 0,7."],
  notes: ["Bewertung ohne Tageskurse."],
  disclaimer: "Keine Anlage- oder Steuerberatung. Alle Angaben ohne Gewähr.",
};

describe("PDF-Report", () => {
  test("rendert ein mehrseitiges PDF mit Steuertabelle und Disclaimer auf jeder Seite", async () => {
    const buffer = await renderReportPdfBuffer(sample);
    expect(buffer.byteLength).toBeGreaterThan(2000);
    expect(Buffer.from(buffer.slice(0, 5)).toString("latin1")).toBe("%PDF-");

    const parser = new PDFParse({ data: Buffer.from(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    expect(result.total).toBe(3);
    expect(result.text).toContain("Depot-Report");
    expect(result.text).toContain("Vorabpauschale 2026");
    expect(result.text).toContain("33,08 €");
    expect(result.text).toContain("IE00TEST0001");
    const disclaimerCount = result.text.split("Keine Anlage- oder Steuerberatung").length - 1;
    expect(disclaimerCount).toBe(3);
  });
});
