import type { BrokerId, ParseWarning } from "@portfolio/csv";
import type { ReportPdfData, ReportTable } from "@portfolio/pdf";
import { DISCLAIMER_LONG } from "@portfolio/legal";
import { projectDisplayUrl } from "@/lib/site";
import type { PerformanceReport } from "./report";
import type { TaxRow, TaxSummary } from "./tax/summary";
import { distributionText, MISSING_PRICES_LABEL, noHoldingText, PROVISIONAL_PRICE_LABEL, TAX_METHOD_NOTES } from "./tax/summary";
import { FUND_TYPE_LABELS } from "./tax/constants";
import { formatEur, formatNumber, formatPercent } from "./money";
import { formatDateDe } from "./dates";
import { timestampForFilename } from "./download";
import { amountKpis, PERFORMANCE_EXPLANATION, performanceKpis, periodText } from "./kpis";
import { BROKER_LABELS } from "./labels";

export const TAX_TABLE_COLUMNS = ["Anteil", "Stück", "Monate", "Basisertrag", "Vorabpausch.", "Steuerpfl.", "Steuer"];
export const TAX_TABLE_WIDTHS = [0.2, 0.08, 0.08, 0.16, 0.18, 0.15, 0.15];

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
  skippedRows?: number;
  warnings?: readonly ParseWarning[];
  generatedAt: Date;
}

export function sourceLineText(meta: PdfMeta, period: string): string {
  const skipped = meta.skippedRows && meta.skippedRows > 0 ? ` · ${meta.skippedRows} übersprungen` : "";
  return `${meta.fileName} · ${BROKER_LABELS[meta.broker]} · ${meta.transactionCount} Buchungen${skipped} · Zeitraum ${period}`;
}

function joinHints(...parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

function priceText(row: TaxRow, field: "yearStartPrice" | "yearEndPrice"): string {
  const value = row.settings[field];
  if (!value) return "–";
  return row.prefilled[field] && row.status !== "notApplicable" ? `${value} € (vorläufig, Kurs aus dem Export)` : `${value} €`;
}

function hintText(row: TaxRow, year: number): string {
  if (row.estimate?.fundType === "none") return "Keine Vorabpauschale: kein Fonds (z. B. Einzelaktie oder Anleihe).";
  if (!row.heldAtYearEnd) return noHoldingText(year);
  return row.sameSourcePrefill
    ? `Keine Schätzung: Der Export enthält für ${year} keinen eigenen Kurs; bitte Kurse am 01.01. und 31.12. eintragen.`
    : "Keine Schätzung: Kurse am 01.01. und 31.12. fehlen; bitte eintragen.";
}

export function buildReportPdfData(report: PerformanceReport, tax: TaxSummary, meta: PdfMeta): ReportPdfData {
  const { portfolio, ttwror } = report;
  const period = periodText(report);

  const metrics = [...performanceKpis(report), ...amountKpis(report)].map((kpi) => ({ label: kpi.label, value: kpi.value, hint: kpi.hint }));

  const valueTable: ReportTable = {
    title: "Wertverlauf an den Depotbuchungstagen",
    columns: ["Datum", "Depotwert", "Externer Zahlungsstrom", "Periodenrendite"],
    rows: portfolio.points.map((point) => {
      const p = ttwror.periods.find((x) => x.to === point.date);
      return {
        cells: [
          formatDateDe(point.date),
          formatEur(point.value),
          point.flow.isZero() ? "–" : formatEur(point.flow),
          p ? formatPercent(p.rate, true) : "–",
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

  const taxStatus = tax.totals.status;
  const statusHint = taxStatus === "missing" ? MISSING_PRICES_LABEL : taxStatus === "provisional" ? PROVISIONAL_PRICE_LABEL : null;
  const taxAmount = (value: Parameters<typeof formatEur>[0]) => (taxStatus === "missing" ? "–" : formatEur(value));
  const taxSummary = [
    {
      label: `Vorabpauschale ${tax.year}`,
      value: taxAmount(tax.totals.vorabpauschale),
      hint: joinHints(statusHint, tax.basiszins ? `Basiszins ${formatPercent(tax.basiszins)}` : null),
    },
    { label: "Steuerpflichtig nach Teilfreistellung", value: taxAmount(tax.totals.taxable), hint: joinHints(statusHint) },
    { label: "Geschätzte Steuer auf Vorabpauschale", value: taxAmount(tax.totals.tax), hint: joinHints(statusHint, "vor Sparerpauschbetrag") },
    { label: `Realisierte Gewinne ${tax.year} (FIFO)`, value: formatEur(tax.totals.realizedGain), hint: "vor Teilfreistellung und Steuer" },
  ];

  const taxTables: ReportTable[] = tax.rows.map((row) => {
    const { position, estimate, settings, sales: saleRows } = row;
    const detailed = estimate !== null && estimate.fundType !== "none" && row.heldAtYearEnd;
    const columns = detailed ? TAX_TABLE_COLUMNS : ["Hinweis"];
    const widths = detailed ? TAX_TABLE_WIDTHS : [1];
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
        : [{ cells: [hintText(row, tax.year)] }];
    const sales = saleRows.map(
      ({ sale, credit, gain }) =>
        `Verkauf ${formatDateDe(sale.date)}, ${formatNumber(sale.sharesSold)} Stück: Erlös ${formatEur(sale.proceeds)}, Anschaffungskosten ${formatEur(sale.cost)}${credit.gt(0) ? `, angesetzte Vorabpauschalen ${formatEur(credit)}` : ""}, Gewinn ${formatEur(gain)} (FIFO)`,
    );
    const footnoteParts = [
      settings.fundType === "none" || !row.heldAtYearEnd
        ? FUND_TYPE_LABELS[settings.fundType]
        : `${FUND_TYPE_LABELS[settings.fundType]} · Kurs 01.01.${tax.year}: ${priceText(row, "yearStartPrice")} · Kurs 31.12.${tax.year}: ${priceText(row, "yearEndPrice")}`,
      ...sales,
      ...(position.distributionsInYear.gt(0) ? [distributionText(position, settings.fundType, tax.year)] : []),
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

  const warnings = (meta.warnings ?? []).map((w) => `Einlesen: ${w.message}`);

  return {
    title: "Depot-Report",
    subtitle: `Performance, Allokation und geschätzte Vorabpauschale ${tax.year}`,
    generatedAt: formatDateDe(timestampForFilename(meta.generatedAt)),
    sourceLine: pdfText(sourceLineText(meta, period)),
    metrics: metrics.map((m) => ({ label: pdfText(m.label), value: pdfText(m.value), hint: pdfText(m.hint) })),
    metricsNote: pdfText(PERFORMANCE_EXPLANATION),
    valueTable: sanitizeTable(valueTable),
    positionsTable: sanitizeTable(positionsTable),
    allocationTables: allocationTables.map(sanitizeTable),
    taxSummary: taxSummary.map((m) => ({ ...m, value: pdfText(m.value), hint: pdfText(m.hint) })),
    taxTables: taxTables.map(sanitizeTable),
    taxMethod: TAX_METHOD_NOTES.map(pdfText),
    notes: [...report.notes, ...warnings].map(pdfText),
    disclaimer: pdfText(DISCLAIMER_LONG),
    footerLine: pdfText(`Erstellt mit DepotDoktor · ${projectDisplayUrl("depotdoktor")}`),
  };
}
