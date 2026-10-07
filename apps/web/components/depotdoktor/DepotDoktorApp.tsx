"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { decodeCsvBytes, detectFileKind, parseBrokerCsv, FILE_KIND_MESSAGES, type ParseSuccess } from "@portfolio/csv";
import { Disclaimer } from "@portfolio/legal";
import { Button } from "@portfolio/ui";
import { PillTabs } from "@/components/site/PillTabs";
import { buildReport } from "@/lib/depotdoktor/report";
import { SAMPLE_CSV_TRADEREPUBLIC, SAMPLE_FILE_NAME, SAMPLE_ROW_COUNT } from "@/lib/depotdoktor/sample";
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
import { SampleCard } from "./SampleCard";

type TabId = "performance" | "allocation" | "tax" | "transactions";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const FILE_TOO_LARGE_MESSAGE =
  "Die Datei ist größer als 25 MB. Broker-Exporte sind normalerweise deutlich kleiner; bitte prüfen Sie, ob es sich um den richtigen Export handelt.";
export const FILE_READ_ERROR_MESSAGE = "Die Datei konnte nicht gelesen werden. Bitte versuchen Sie es mit einer anderen Kopie des Exports.";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
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
  const errorRef = useRef<HTMLDivElement>(null);

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

  function reset() {
    setParsed(null);
    setError(null);
    setFileName(null);
    dispatchTaxInput({ type: "reset" });
    setSaleCredits({});
  }

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest" });
  }, [error, fileName]);

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
      skippedRows: parsed.skippedRows,
      warnings: parsed.warnings,
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
      <section className="space-y-5" data-testid="upload-section">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <FileDrop onFile={handleFile} invalid={Boolean(error)} />
            {error ? (
              <div
                ref={errorRef}
                role="alert"
                data-testid="parse-error"
                className="scroll-mt-6 scroll-mb-6 rounded-2xl border border-wine/40 bg-wine-soft px-5 py-4 text-sm leading-relaxed text-wine"
              >
                <p className="font-medium">Datei nicht auswertbar</p>
                <p className="mt-1">
                  {fileName ? <span className="font-medium wrap-anywhere">{fileName}: </span> : null}
                  {error}
                </p>
              </div>
            ) : null}
          </div>
          <SampleCard onLoad={() => loadText(SAMPLE_CSV_TRADEREPUBLIC, SAMPLE_FILE_NAME)} rowCount={SAMPLE_ROW_COUNT} />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8" data-testid="report-section">
      <div className="rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden="true" className="hidden h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-950 text-gold-light sm:grid">
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M6 3.5h8l4 4v13H6Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M8.5 16.5 11 14l2 1.5 3-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Geladene Datei</p>
              <p className="mt-1 text-sm break-words">
                <span className="font-medium text-ink">{fileName}</span>
                <span className="text-slate">
                  {" "}
                  · {BROKER_LABELS[parsed.broker]} · {parsed.transactions.length} Buchungen
                  {parsed.skippedRows > 0 ? ` · ${parsed.skippedRows} übersprungen` : ""}
                </span>
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={reset} className="shrink-0 self-start sm:self-auto">
            Andere Datei
          </Button>
        </div>
        <div className="border-t border-line px-5 py-4 sm:px-6">
          <ExportBar onExportPdf={exportPdf} onExportCsv={exportCsv} />
        </div>
        {parsed.warnings.length > 0 ? (
          <details className="group border-t border-line px-5 py-3.5 text-sm sm:px-6">
            <summary className="flex cursor-pointer list-none items-center gap-3 text-ink [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-gold-soft text-[0.6875rem] font-semibold text-gold-deep">
                i
              </span>
              <span>
                {parsed.warnings.length} Hinweis{parsed.warnings.length === 1 ? "" : "e"} beim Einlesen
              </span>
              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 text-slate transition-transform group-open:rotate-180">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <ul className="bullet-list mt-3 max-w-[66ch] pl-8 text-slate">
              {parsed.warnings.map((w) => (
                <li key={`${w.rowIndex}-${w.message}`}>{w.message}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <PillTabs tabs={TABS} active={tab} onChange={setTab} label="Auswertungen" />

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {report && tab === "performance" ? <PerformanceTab report={report} /> : null}
        {report && tab === "allocation" ? <AllocationTab report={report} /> : null}
        {tab === "tax" ? (
          <TaxTab
            summary={taxSummary}
            broker={parsed.broker}
            onYearChange={setTaxYear}
            onInputChange={dispatchTaxInput}
            onCreditChange={updateSaleCredit}
          />
        ) : null}
        {tab === "transactions" ? <TransactionsTab transactions={parsed.transactions} /> : null}
      </div>

      <div className="border-t border-line pt-5">
        <Disclaimer className="max-w-[80ch] text-xs leading-relaxed text-slate" />
      </div>
    </section>
  );
}
