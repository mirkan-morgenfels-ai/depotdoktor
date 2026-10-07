"use client";

import { useCallback, useMemo, useReducer, useState, type KeyboardEvent } from "react";
import { decodeCsvBytes, detectFileKind, parseBrokerCsv, FILE_KIND_MESSAGES, type ParseSuccess } from "@portfolio/csv";
import { Disclaimer } from "@portfolio/legal";
import { Button } from "@portfolio/ui";
import { buildReport } from "@/lib/depotdoktor/report";
import { SAMPLE_CSV_SCALABLE } from "@/lib/depotdoktor/sample";
import { buildTaxSummary, type SaleCreditInputs } from "@/lib/depotdoktor/tax/summary";
import { EMPTY_TAX_INPUTS, taxInputsReducer } from "@/lib/depotdoktor/tax/inputs";
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

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FILE_TOO_LARGE_MESSAGE =
  "Die Datei ist größer als 25 MB. Broker-Exporte sind normalerweise deutlich kleiner; bitte prüfen Sie, ob es sich um den richtigen Export handelt.";
export const FILE_READ_ERROR_MESSAGE = "Die Datei konnte nicht gelesen werden. Bitte versuchen Sie es mit einer anderen Kopie des Exports.";

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
  const [taxInputs, dispatchTaxInput] = useReducer(taxInputsReducer, EMPTY_TAX_INPUTS);
  const [saleCredits, setSaleCredits] = useState<SaleCreditInputs>({});

  const transactions = useMemo(() => parsed?.transactions ?? [], [parsed]);
  const report = useMemo(() => (parsed ? buildReport(transactions) : null), [parsed, transactions]);
  const taxSummary = useMemo(
    () => buildTaxSummary(transactions, taxYear, taxInputs, saleCredits),
    [transactions, taxYear, taxInputs, saleCredits],
  );

  function loadText(text: string, name: string) {
    const result = parseBrokerCsv(text);
    setFileName(name);
    dispatchTaxInput({ type: "reset" });
    setSaleCredits({});
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
    if (file.size > MAX_FILE_BYTES) {
      setParsed(null);
      setFileName(file.name);
      setError(FILE_TOO_LARGE_MESSAGE);
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const kind = detectFileKind(bytes);
      if (kind !== "text") {
        setParsed(null);
        setFileName(file.name);
        setError(FILE_KIND_MESSAGES[kind]);
        return;
      }
      loadText(decodeCsvBytes(bytes), file.name);
    } catch {
      setParsed(null);
      setFileName(file.name);
      setError(FILE_READ_ERROR_MESSAGE);
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((t) => t.id === tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const target = TABS[next];
    if (!target) return;
    setTab(target.id);
    document.getElementById(`tab-${target.id}`)?.focus();
  }

  function reset() {
    setParsed(null);
    setError(null);
    setFileName(null);
    dispatchTaxInput({ type: "reset" });
    setSaleCredits({});
  }

  const updateSaleCredit = useCallback((saleId: string, value: string) => {
    setSaleCredits((prev) => ({ ...prev, [saleId]: value }));
  }, []);

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

      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Auswertungen">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={handleTabKey}
            className={
              tab === t.id
                ? "-mb-px border-b-2 border-gold px-4 py-2 text-sm font-medium"
                : "px-4 py-2 text-sm text-muted hover:text-ink"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {report && tab === "performance" ? <PerformanceTab report={report} /> : null}
        {report && tab === "allocation" ? <AllocationTab report={report} /> : null}
        {tab === "tax" ? (
          <TaxTab
            summary={taxSummary}
            onYearChange={setTaxYear}
            onInputChange={dispatchTaxInput}
            onCreditChange={updateSaleCredit}
          />
        ) : null}
        {tab === "transactions" ? <TransactionsTab transactions={parsed.transactions} /> : null}
      </div>

      <Disclaimer className="text-xs text-muted" />
    </section>
  );
}
