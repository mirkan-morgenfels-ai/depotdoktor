"use client";

import { useState } from "react";
import { Button } from "@portfolio/ui";

export interface ExportBarProps {
  onExportPdf: () => Promise<void>;
  onExportCsv: () => void;
}

export function ExportBar({ onExportPdf, onExportCsv }: ExportBarProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePdf() {
    setBusy(true);
    setError(null);
    try {
      await onExportPdf();
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF konnte nicht erzeugt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <Button onClick={handlePdf} disabled={busy} data-testid="export-pdf" className="max-sm:w-full">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gold-light">
            <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {busy ? "PDF wird erzeugt …" : "Report als PDF"}
        </Button>
        <Button variant="secondary" onClick={onExportCsv} data-testid="export-csv" className="max-sm:w-full">
          Transaktionen als CSV
        </Button>
        {error ? (
          <span role="alert" className="text-xs text-wine">
            {error}
          </span>
        ) : null}
      </div>
      <p data-testid="export-hint" className="max-w-[70ch] text-xs leading-snug text-slate">
        Beide Exporte entstehen im Browser; Ihre Daten werden nicht übertragen. Die CSV ist für Excel mit deutschen Ländereinstellungen eingerichtet (Semikolon, Dezimalkomma).
      </p>
    </div>
  );
}
