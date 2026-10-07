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
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handlePdf} disabled={busy} data-testid="export-pdf">
        {busy ? "PDF wird erzeugt …" : "Report als PDF"}
      </Button>
      <Button variant="secondary" onClick={onExportCsv} data-testid="export-csv">
        Transaktionen als CSV
      </Button>
      <span className="text-xs text-muted">Beide Exporte entstehen im Browser; Ihre Daten werden nicht übertragen.</span>
      {error ? (
        <span role="alert" className="text-xs text-bordeaux">
          {error}
        </span>
      ) : null}
    </div>
  );
}
