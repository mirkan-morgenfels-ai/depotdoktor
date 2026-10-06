export type FileKind = "text" | "pdf" | "zip" | "binary" | "empty";

export type Utf16Encoding = "utf-16le" | "utf-16be";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP_SIGNATURE = [0x50, 0x4b];
const UTF16LE_BOM = [0xff, 0xfe];
const UTF16BE_BOM = [0xfe, 0xff];
const UTF16_BOM_LENGTH = 2;
const SAMPLE_BYTES = 4096;
const CONTROL_SHARE_LIMIT = 0.05;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function isControlCode(code: number): boolean {
  return code < 0x09 || (code > 0x0d && code < 0x20);
}

function classifyCodes(codes: Iterable<number>, count: number): FileKind {
  let control = 0;
  for (const code of codes) {
    if (code === 0) return "binary";
    if (isControlCode(code)) control += 1;
  }
  return control > count * CONTROL_SHARE_LIMIT ? "binary" : "text";
}

function utf16CodeUnits(text: string): number[] {
  const codes: number[] = [];
  for (let index = 0; index < text.length; index += 1) codes.push(text.charCodeAt(index));
  return codes;
}

export function detectUtf16Bom(bytes: Uint8Array): Utf16Encoding | null {
  if (startsWith(bytes, UTF16LE_BOM)) return "utf-16le";
  if (startsWith(bytes, UTF16BE_BOM)) return "utf-16be";
  return null;
}

export function detectFileKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) return "empty";
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWith(bytes, ZIP_SIGNATURE)) return "zip";
  const utf16 = detectUtf16Bom(bytes);
  if (utf16) {
    const sample = bytes.subarray(UTF16_BOM_LENGTH, Math.min(bytes.length, SAMPLE_BYTES));
    if (sample.length === 0) return "empty";
    const codes = utf16CodeUnits(new TextDecoder(utf16, { ignoreBOM: true }).decode(sample));
    return classifyCodes(codes, codes.length);
  }
  const sample = bytes.subarray(0, Math.min(bytes.length, SAMPLE_BYTES));
  return classifyCodes(sample, sample.length);
}

export function decodeCsvBytes(bytes: Uint8Array): string {
  const utf16 = detectUtf16Bom(bytes);
  if (utf16) return new TextDecoder(utf16, { ignoreBOM: false }).decode(bytes);
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
