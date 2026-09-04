"use client";

import { useCallback, useMemo, useState } from "react";
import { parseBrokerCsv, type ParseSuccess } from "@portfolio/csv";
import { Disclaimer } from "@portfolio/legal";
import { Button } from "@portfolio/ui";
import { buildReport } from "@/lib/depotdoktor/report";
import { SAMPLE_CSV_SCALABLE } from "@/lib/depotdoktor/sample";
import { buildTaxSummary, type PositionSettings } from "@/lib/depotdoktor/tax/summary";
import { buildReportPdfData, BROKER_LABELS } from "@/lib/depotdoktor/pdf-data";
import { transactionsToCsv } from "@/lib/depotdoktor/export-csv";
import { downloadBlob, timestampForFilename } from "@/lib/depotdoktor/download";
import { FileDrop } from "./FileDrop";
import { PerformanceTab } from "./PerformanceTab";
import { AllocationTab } from "./AllocationTab";
import { TaxTab, TAX_YEARS } from "./TaxTab";
import { TransactionsTab } from "./TransactionsTab";
import { ExportBar } from "./ExportBar";

type TabId = "performance" | "allocation" | "tax" | "transactions";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "performance", label: "Performance" },
  { id: "allocation", label: "Allokation" },
  { id: "tax", label: "Steuer" },
  { id: "transactions", label: "Transaktionen" },
];

export function DepotDoktorApp() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("performance");
  const [taxYear, setTaxYear] = useState<number>(TAX_YEARS[0] ?? 2026);
  const [taxSettings, setTaxSettings] = useState<Record<string, PositionSettings>>({});

  const transactions = useMemo(() => parsed?.transactions ?? [], [parsed]);
  const report = useMemo(() => (parsed ? buildReport(transactions) : null), [parsed, transactions]);
  const taxSummary = useMemo(() => buildTaxSummary(transactions, taxYear, taxSettings), [transactions, taxYear, taxSettings]);

  function loadText(text: string, name: string) {
    const result = parseBrokerCsv(text);
    setFileName(name);
    setTaxSettings({});
    if (result.ok) {
      setParsed(result);
      setError(null);
      setTab("performance");
    } else {
      setParsed(null);
      setError(result.error);
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    loadText(text, file.name);
  }

  function reset() {
    setParsed(null);
    setError(null);
    setFileName(null);
    setTaxSettings({});
  }

  const updateTaxSettings = useCallback(
    (positionKey: string, patch: Partial<PositionSettings>) => {
      const row = taxSummary.rows.find((r) => r.position.key === positionKey);
      if (!row) return;
      setTaxSettings((prev) => ({ ...prev, [positionKey]: { ...(prev[positionKey] ?? row.settings), ...patch } }));
    },
    [taxSummary],
  );

  async function exportPdf() {
    if (!parsed || !report) return;
    const { renderReportPdf } = await import("@portfolio/pdf");
    const data = buildReportPdfData(report, taxSummary, {
      fileName: fileName ?? "export.csv",
      broker: parsed.broker,
      transactionCount: parsed.transactions.length,
      generatedAt: new Date(),
    });
    const blob = await renderReportPdf(data);
    downloadBlob(blob, `depotdoktor-report-${timestampForFilename()}.pdf`);
  }

  function exportCsv() {
    if (!parsed) return;
    const blob = new Blob([transactionsToCsv(parsed.transactions)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `depotdoktor-transaktionen-${timestampForFilename()}.csv`);
  }

  if (!parsed) {
    return (
      <section className="space-y-4" data-testid="upload-section">
        <FileDrop onFile={handleFile} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Button variant="secondary" onClick={() => loadText(SAMPLE_CSV_SCALABLE, "beispiel-scalable.csv")}>
            Beispieldatei laden
          </Button>
          <span className="text-muted">Synthetische Scalable-Capital-CSV mit sieben Buchungen, keine echten Daten.</span>
        </div>
        {error ? (
          <p role="alert" data-testid="parse-error" className="rounded-md border border-bordeaux bg-bordeaux-soft px-4 py-3 text-sm text-bordeaux">
            {fileName ? <strong>{fileName}: </strong> : null}
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-6" data-testid="report-section">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
        <div>
          <span className="font-medium">{fileName}</span>
          <span className="text-muted">
            {" "}
            · {BROKER_LABELS[parsed.broker]} · {parsed.transactions.length} Buchungen
            {parsed.skippedRows > 0 ? ` · ${parsed.skippedRows} übersprungen` : ""}
          </span>
        </div>
        <Button variant="secondary" onClick={reset}>
          Andere Datei
        </Button>
      </div>

      {parsed.warnings.length > 0 ? (
        <details className="rounded-md border border-gold bg-gold-soft px-4 py-3 text-sm">
          <summary className="cursor-pointer">
            {parsed.warnings.length} Hinweis{parsed.warnings.length === 1 ? "" : "e"} beim Einlesen
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {parsed.warnings.map((w) => (
              <li key={`${w.rowIndex}-${w.message}`}>{w.message}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <ExportBar onExportPdf={exportPdf} onExportCsv={exportCsv} />

      <nav className="flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "-mb-px border-b-2 border-gold px-4 py-2 text-sm font-medium"
                : "px-4 py-2 text-sm text-muted hover:text-ink"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      {report && tab === "performance" ? <PerformanceTab report={report} /> : null}
      {report && tab === "allocation" ? <AllocationTab report={report} /> : null}
      {tab === "tax" ? <TaxTab summary={taxSummary} onYearChange={setTaxYear} onSettingsChange={updateTaxSettings} /> : null}
      {tab === "transactions" ? <TransactionsTab transactions={parsed.transactions} /> : null}

      <Disclaimer className="text-xs text-muted" />
    </section>
  );
}
