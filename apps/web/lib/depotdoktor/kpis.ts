import type { PerformanceReport } from "./report";
import type { DrawdownResult } from "./metrics/drawdown";
import { formatEur, formatPercent } from "./money";
import { formatDateDe } from "./dates";

export type KpiTone = "neutral" | "positive" | "negative";

export interface Kpi {
  key: string;
  label: string;
  value: string;
  hint: string;
  tone: KpiTone;
}

export const PERFORMANCE_EXPLANATION =
  "Die TTWROR misst die Wertentwicklung unabhängig davon, wann Sie Geld investiert haben; der IRR berücksichtigt Zeitpunkt und Höhe Ihrer Käufe und Verkäufe. Der IRR p. a. hängt vom Endzeitpunkt ab.";

function toneOf(value: number | null | undefined): KpiTone {
  if (value === null || value === undefined) return "neutral";
  return value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
}

export function periodText(report: PerformanceReport): string {
  const { firstDate, lastDate } = report.portfolio;
  return firstDate && lastDate ? `${formatDateDe(firstDate)} bis ${formatDateDe(lastDate)}` : "–";
}

export function valuationText(report: PerformanceReport): string {
  const { lastDate } = report.portfolio;
  return lastDate ? `bewertet zum letzten Kurs im Export, Stand ${formatDateDe(lastDate)}` : "bewertet zum letzten Kurs im Export";
}

export function drawdownHint({ peakDate, troughDate }: DrawdownResult): string {
  if (!peakDate || !troughDate) return "";
  return peakDate === troughDate ? `am ${formatDateDe(troughDate)} (Kauftag)` : `${formatDateDe(peakDate)} → ${formatDateDe(troughDate)}`;
}

export function ttwrorKpi(report: PerformanceReport): Kpi {
  const { ttwror, ttwrorAnnualized } = report;
  const period = periodText(report);
  if (ttwrorAnnualized) {
    return {
      key: "ttwror",
      label: "TTWROR (p. a.)",
      value: formatPercent(ttwrorAnnualized, true),
      hint: `kumuliert ${formatPercent(ttwror.total, true)} · ${period}`,
      tone: toneOf(ttwrorAnnualized.toNumber()),
    };
  }
  return {
    key: "ttwror",
    label: "TTWROR (kumuliert)",
    value: formatPercent(ttwror.total, true),
    hint: `nicht annualisiert, Zeitraum unter 1 Jahr · ${period}`,
    tone: toneOf(ttwror.total?.toNumber()),
  };
}

export function performanceKpis(report: PerformanceReport): Kpi[] {
  const { irr, volatility, drawdown } = report;
  return [
    ttwrorKpi(report),
    {
      key: "irr",
      label: "IRR (geldgewichtet, p. a.)",
      value: irr.ok ? formatPercent(irr.rate, true) : "–",
      hint: irr.ok ? valuationText(report) : "nicht bestimmbar",
      tone: irr.ok ? toneOf(irr.rate) : "neutral",
    },
    {
      key: "volatility",
      label: "Volatilität",
      value: volatility ? `${formatPercent(volatility)} p. a.` : "–",
      hint: "aus Transaktionsbewertungen",
      tone: "neutral",
    },
    {
      key: "drawdown",
      label: "Max Drawdown",
      value: drawdown.maxDrawdown.gt(0) ? `−${formatPercent(drawdown.maxDrawdown)}` : formatPercent(0),
      hint: drawdownHint(drawdown),
      tone: drawdown.maxDrawdown.gt(0) ? "negative" : "neutral",
    },
  ];
}

export function amountKpis(report: PerformanceReport): Kpi[] {
  const { totals } = report.portfolio;
  const amount = (key: string, label: string, value: Parameters<typeof formatEur>[0], hint = ""): Kpi => ({
    key,
    label,
    value: formatEur(value),
    hint,
    tone: "neutral",
  });
  return [
    amount("end-value", "Depotwert (letzter Kurs)", totals.endValue),
    amount("invested", "Investiert (Käufe)", totals.invested),
    amount("proceeds", "Verkaufserlöse", totals.proceeds),
    amount("dividends", "Dividenden netto", totals.dividends),
    amount("fees", "Gebühren", totals.fees),
    amount("taxes", "Abgeführte Steuern", totals.taxes),
    amount("deposits", "Einzahlungen Konto", totals.deposits, "nicht in TTWROR/IRR"),
    amount("interest", "Zinsen Konto", totals.interest, "nicht in TTWROR/IRR"),
  ];
}
