import { describe, expect, test } from "vitest";
import { PDFParse } from "pdf-parse";
import { renderReportPdfBuffer } from "./index";
import type { ReportPdfData } from "./types";

const sample: ReportPdfData = {
  title: "Depot-Report",
  subtitle: "Performance, Allokation und geschätzte Vorabpauschale 2026",
  generatedAt: "03.09.2026",
  sourceLine: "test.csv · Scalable Capital · 6 Buchungen · 1 übersprungen · Zeitraum 06.01.2026 bis 20.06.2026",
  metrics: [
    { label: "TTWROR (kumuliert)", value: "+2,40 %", hint: "nicht annualisiert, Zeitraum unter 1 Jahr" },
    { label: "IRR (geldgewichtet, p. a.)", value: "+5,51 %", hint: "bewertet zum letzten Kurs im Export, Stand 20.06.2026" },
    { label: "Volatilität", value: "2,32 % p. a." },
    { label: "Max Drawdown", value: "-0,02 %" },
    { label: "Depotwert (letzter Kurs)", value: "8.720,00 €" },
    { label: "Investiert (Käufe)", value: "9.002,00 €" },
    { label: "Verkaufserlöse", value: "479,00 €" },
    { label: "Dividenden netto", value: "18,50 €" },
    { label: "Gebühren", value: "3,00 €" },
    { label: "Abgeführte Steuern", value: "6,50 €" },
    { label: "Einzahlungen Konto", value: "10.000,00 €" },
    { label: "Zinsen Konto", value: "3,21 €" },
  ],
  metricsNote: "Die TTWROR misst die Wertentwicklung unabhängig davon, wann Sie Geld investiert haben.",
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
  notes: ["Bewertung ohne Tageskurse.", "Einlesen: Zeile 7 übersprungen (Status Pending)."],
  disclaimer: "Keine Anlage- oder Steuerberatung. Alle Angaben ohne Gewähr.",
  footerLine: "Erstellt mit DepotDoktor · depotdoktor.vercel.app/projects/depotdoktor",
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
    const footerCount = result.text.split("Erstellt mit DepotDoktor · depotdoktor.vercel.app/projects/depotdoktor").length - 1;
    expect(footerCount).toBe(3);
  });

  test("zeigt alle zwölf Kennzahlen, den Erklärsatz, übersprungene Zeilen und Hinweise zum Einlesen", async () => {
    const parser = new PDFParse({ data: Buffer.from(await renderReportPdfBuffer(sample)) });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text.replace(/\s+/g, " ");
    for (const metric of sample.metrics) {
      expect(text).toContain(metric.label.toUpperCase());
      expect(text).toContain(metric.value);
    }
    expect(text).toContain("unabhängig davon, wann Sie Geld investiert haben");
    expect(text).toContain("1 übersprungen");
    expect(text).toContain("Einlesen: Zeile 7 übersprungen (Status Pending).");
  });
});
