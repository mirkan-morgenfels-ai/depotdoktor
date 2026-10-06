import type { BrokerId } from "@portfolio/csv";
import type { ReportPdfData, ReportTable } from "@portfolio/pdf";
import { DISCLAIMER_LONG } from "@portfolio/legal";
import type { PerformanceReport } from "./report";
import type { TaxSummary } from "./tax/summary";
import { TAX_METHOD_NOTES } from "./tax/summary";
import { FUND_TYPE_LABELS } from "./tax/constants";
import { formatEur, formatNumber, formatPercent } from "./money";
import { formatDateDe } from "./dates";
import { timestampForFilename } from "./download";

export const BROKER_LABELS: Record<BrokerId, string> = {
  traderepublic: "Trade Republic",
  scalable: "Scalable Capital",
};

function pdfText(text: string): string {
  return text.replace(/\u2212/g, "-").replace(/\u2192/g, "bis").replace(/[\u202F\u2009]/g, "\u00A0");
}

function sanitizeTable(table: ReportTable): ReportTable {
  return {
    ...table,
    title: pdfText(table.title),
    columns: table.columns.map(pdfText),
    rows: table.rows.map((r) => ({ ...r, cells: r.cells.map(pdfText) })),
    ...(table.footnote ? { footnote: pdfText(table.footnote) } : {}),
  };
}

export interface PdfMeta {
  fileName: string;
  broker: BrokerId;
  transactionCount: number;
  generatedAt: Date;
}

export function buildReportPdfData(report: PerformanceReport, tax: TaxSummary, meta: PdfMeta): ReportPdfData {
  const { portfolio, ttwror, ttwrorAnnualized, irr, volatility, drawdown } = report;
  const period =
    portfolio.firstDate && portfolio.lastDate ? `${formatDateDe(portfolio.firstDate)} bis ${formatDateDe(portfolio.lastDate)}` : "–";

  const metrics = [
    {
      label: "TTWROR",
      value: formatPercent(ttwror.total, true),
      hint: ttwrorAnnualized ? `${formatPercent(ttwrorAnnualized, true)} p. a.` : period,
    },
    {
      label: "IRR (geldgewichtet)",
      value: irr.ok ? `${formatPercent(irr.rate, true)} p. a.` : "nicht bestimmbar",
      hint: irr.ok ? `${irr.method === "newton" ? "Newton" : "Bisektion"}, ${irr.iterations} Iterationen` : "",
    },
    { label: "Volatilität", value: volatility ? `${formatPercent(volatility)} p. a.` : "–", hint: "aus Transaktionsbewertungen" },
    {
      label: "Max Drawdown",
      value: drawdown.maxDrawdown.gt(0) ? `-${formatPercent(drawdown.maxDrawdown)}` : formatPercent(0),
      hint: drawdown.peakDate && drawdown.troughDate ? `${formatDateDe(drawdown.peakDate)} bis ${formatDateDe(drawdown.troughDate)}` : "",
    },
    { label: "Depotwert (letzter Kurs)", value: formatEur(portfolio.totals.endValue) },
    { label: "Investiert (Käufe)", value: formatEur(portfolio.totals.invested) },
    { label: "Verkaufserlöse", value: formatEur(portfolio.totals.proceeds) },
    { label: "Dividenden netto", value: formatEur(portfolio.totals.dividends) },
  ];

  const valueTable: ReportTable = {
    title: "Wertverlauf an den Buchungstagen",
    columns: ["Datum", "Depotwert", "Externer Zahlungsstrom", "Periodenrendite"],
    rows: portfolio.points.map((point, index) => {
      const p = ttwror.periods.find((x) => x.to === point.date);
      return {
        cells: [
          formatDateDe(point.date),
          formatEur(point.value),
          point.flow.isZero() ? "–" : formatEur(point.flow),
          index === 0 || !p ? "–" : formatPercent(p.rate, true),
        ],
      };
    }),
  };

  const positionsTable: ReportTable = {
    title: "Offene Positionen",
    columns: ["Name", "ISIN", "Stück", "Letzter Kurs", "Wert", "Einstand"],
    align: ["left", "left", "right", "right", "right", "right"],
    widths: [0.3, 0.18, 0.1, 0.14, 0.14, 0.14],
    rows: portfolio.positions.map((p) => ({
      cells: [p.name, p.isin ?? "–", formatNumber(p.shares), formatEur(p.lastPrice), formatEur(p.value), formatEur(p.costBasis)],
    })),
  };

  const allocationTables: ReportTable[] = [
    { title: "Nach Assetklasse", slices: report.allocation.byAssetClass },
    { title: "Nach Region (Ländercode der ISIN)", slices: report.allocation.byRegion },
  ].map((t) => ({
    title: t.title,
    columns: ["Gruppe", "Anteil", "Wert"],
    rows: t.slices.map((s) => ({ cells: [s.label, formatPercent(s.share), formatEur(s.value)] })),
  }));

  const taxSummary = [
    { label: `Vorabpauschale ${tax.year}`, value: formatEur(tax.totals.vorabpauschale), hint: `Basiszins ${formatPercent(tax.basiszins)}` },
    { label: "Steuerpflichtig nach Teilfreistellung", value: formatEur(tax.totals.taxable) },
    { label: "Geschätzte Steuer auf Vorabpauschale", value: formatEur(tax.totals.tax), hint: "vor Sparerpauschbetrag" },
    { label: `Realisierte Gewinne ${tax.year} (FIFO)`, value: formatEur(tax.totals.realizedGain), hint: "vor Teilfreistellung und Steuer" },
  ];

  const taxTables: ReportTable[] = tax.rows.map((row) => {
    const { position, estimate, settings, sales: saleRows } = row;
    const detailed = estimate !== null && estimate.fundType !== "none";
    const columns = detailed ? ["Anteil", "Stück", "Monate", "Basisertrag", "Vorabpauschale", "Steuerpflichtig", "Steuer"] : ["Hinweis"];
    const widths = detailed ? [0.22, 0.09, 0.09, 0.15, 0.15, 0.15, 0.15] : [1];
    const rows =
      detailed && estimate
        ? [
            ...estimate.parts.map((part) => ({
              cells: [
                part.label.startsWith("Kauf ") ? `Kauf ${formatDateDe(part.label.slice(5))}` : part.label,
                formatNumber(part.shares),
                String(part.monthsBeforeAcquisition),
                formatEur(part.result.basisertrag),
                formatEur(part.result.vorabpauschale),
                formatEur(part.result.taxable),
                formatEur(part.result.tax),
              ],
            })),
            {
              cells: ["Summe", "", "", "", formatEur(estimate.vorabpauschale), formatEur(estimate.taxable), formatEur(estimate.tax)],
              emphasis: true,
            },
          ]
        : [{ cells: [estimate ? "Keine Vorabpauschale: kein Fonds (z. B. Einzelaktie oder Anleihe)." : "Keine Schätzung: Kurse am 01.01. und 31.12. fehlen."] }];
    const sales = saleRows.map(
      ({ sale, credit, gain }) =>
        `Verkauf ${formatDateDe(sale.date)}, ${formatNumber(sale.sharesSold)} Stück: Erlös ${formatEur(sale.proceeds)}, Anschaffungskosten ${formatEur(sale.cost)}${credit.gt(0) ? `, angesetzte Vorabpauschalen ${formatEur(credit)}` : ""}, Gewinn ${formatEur(gain)} (FIFO)`,
    );
    const footnoteParts = [
      `${FUND_TYPE_LABELS[settings.fundType]} · Kurs 01.01.: ${settings.yearStartPrice || "–"} € · Kurs 31.12.: ${settings.yearEndPrice || "–"} €`,
      ...sales,
      ...(position.distributionsInYear.gt(0) ? [`Ausschüttungen ${tax.year}: ${formatEur(position.distributionsInYear)}`] : []),
    ];
    return {
      title: `${position.name}${position.isin ? ` (${position.isin})` : ""}`,
      columns,
      align: detailed ? ["left", "right", "right", "right", "right", "right", "right"] : ["left"],
      widths,
      rows,
      footnote: footnoteParts.join(" · "),
    };
  });

  return {
    title: "Depot-Report",
    subtitle: `Performance, Allokation und geschätzte Vorabpauschale ${tax.year}`,
    generatedAt: formatDateDe(timestampForFilename(meta.generatedAt)),
    sourceLine: pdfText(`${meta.fileName} · ${BROKER_LABELS[meta.broker]} · ${meta.transactionCount} Buchungen · Zeitraum ${period}`),
    metrics: metrics.map((m) => ({ ...m, label: pdfText(m.label), value: pdfText(m.value), hint: pdfText(m.hint ?? "") })),
    valueTable: sanitizeTable(valueTable),
    positionsTable: sanitizeTable(positionsTable),
    allocationTables: allocationTables.map(sanitizeTable),
    taxSummary: taxSummary.map((m) => ({ ...m, value: pdfText(m.value), hint: pdfText(m.hint ?? "") })),
    taxTables: taxTables.map(sanitizeTable),
    taxMethod: TAX_METHOD_NOTES.map(pdfText),
    notes: report.notes.map(pdfText),
    disclaimer: pdfText(DISCLAIMER_LONG),
  };
}
