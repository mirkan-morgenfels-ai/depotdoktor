"use client";

import { useRef, useState, type DragEvent } from "react";

export function FileDrop({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
      className={
        active
          ? "rounded-lg border-2 border-dashed border-gold bg-gold-soft p-10 text-center"
          : "rounded-lg border-2 border-dashed border-line bg-surface p-10 text-center"
      }
    >
      <p className="font-serif text-xl">CSV-Export hierher ziehen</p>
      <p className="mt-2 text-sm text-muted">
        Trade Republic: App → Kontoauszüge → Transaktionsexport. Scalable Capital: Broker → Transaktionen → CSV.
      </p>
      <p className="mt-1 text-sm text-muted">Nur CSV. PDF-Kontoauszüge und Excel-Dateien kann DepotDoktor nicht lesen.</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-md bg-ink px-4 py-2 text-sm text-paper hover:bg-green"
      >
        Datei auswählen
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-label="CSV-Export auswählen"
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
