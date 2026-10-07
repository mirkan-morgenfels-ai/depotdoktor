"use client";

import { useRef, useState, type DragEvent } from "react";
import { Button, cx } from "@portfolio/ui";
import { UploadGlyph } from "@/components/site/motif";

const BROKER_STEPS = [
  { broker: "Trade Republic", path: "App → Kontoauszüge → Transaktionsexport" },
  { broker: "Scalable Capital", path: "Broker → Transaktionen → CSV" },
] as const;

export function FileDrop({ onFile, invalid = false }: { onFile: (file: File) => void; invalid?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={handleDrop}
        className={cx(
          "flex h-full flex-col items-center rounded-xl border border-dashed px-5 py-10 text-center transition-colors duration-150 sm:px-10 sm:py-12",
          active ? "border-gold bg-gold-soft" : invalid ? "border-wine/60 bg-wine-soft/30" : "border-line-strong/60 bg-ivory/40",
        )}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full border border-line bg-surface text-ink shadow-card">
          <UploadGlyph className="h-9 w-9" />
        </span>
        <p className="display mt-6 text-[1.75rem] leading-tight text-ink sm:text-[2rem]">
          <span className="hidden pointer-fine:inline">CSV-Export hierher ziehen</span>
          <span className="pointer-fine:hidden">CSV-Export auswählen</span>
        </p>
        <p className="mt-2 hidden text-sm text-slate pointer-fine:block">oder eine Datei von Ihrem Gerät wählen</p>
        <Button className="mt-6" onClick={() => inputRef.current?.click()}>
          Datei auswählen
        </Button>
        <dl className="mt-9 grid w-full max-w-xl gap-3 border-t border-line pt-6 text-left text-[13px] sm:grid-cols-2 sm:gap-6">
          {BROKER_STEPS.map((step) => (
            <div key={step.broker}>
              <dt className="text-[0.6875rem] font-medium tracking-[0.14em] text-gold-deep uppercase">{step.broker}</dt>
              <dd className={cx("mt-1 leading-snug", active ? "text-ink" : "text-slate")}>{step.path}</dd>
            </div>
          ))}
        </dl>
        <p className={cx("mt-5 text-xs", active ? "text-ink" : "text-slate")}>
          Nur CSV. PDF-Kontoauszüge und Excel-Dateien kann DepotDoktor nicht lesen.
        </p>
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
    </div>
  );
}
