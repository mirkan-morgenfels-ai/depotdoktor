export type FileKind = "text" | "pdf" | "zip" | "binary" | "empty";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP_SIGNATURE = [0x50, 0x4b];
const SAMPLE_BYTES = 4096;
const CONTROL_SHARE_LIMIT = 0.05;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export function detectFileKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) return "empty";
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWith(bytes, ZIP_SIGNATURE)) return "zip";
  const sample = bytes.subarray(0, Math.min(bytes.length, SAMPLE_BYTES));
  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return "binary";
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) control += 1;
  }
  return control > sample.length * CONTROL_SHARE_LIMIT ? "binary" : "text";
}

export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export const PDF_FILE_MESSAGE =
  "Das ist eine PDF-Datei, vermutlich ein Kontoauszug oder eine Abrechnung. DepotDoktor liest nur den CSV-Transaktionsexport. Trade Republic: App → Kontoauszüge → Transaktionsexport. Scalable Capital: Broker → Transaktionen → CSV.";

export const ZIP_FILE_MESSAGE =
  "Das ist eine ZIP- oder Excel-Datei. Bitte den CSV-Transaktionsexport des Brokers verwenden oder die Tabelle in Excel über „Speichern unter“ als CSV ablegen.";

export const BINARY_FILE_MESSAGE =
  "Die Datei ist keine Textdatei. Bitte den CSV-Transaktionsexport des Brokers verwenden.";

export const EMPTY_FILE_MESSAGE = "Die Datei ist leer.";

export const FILE_KIND_MESSAGES: Record<Exclude<FileKind, "text">, string> = {
  pdf: PDF_FILE_MESSAGE,
  zip: ZIP_FILE_MESSAGE,
  binary: BINARY_FILE_MESSAGE,
  empty: EMPTY_FILE_MESSAGE,
};
