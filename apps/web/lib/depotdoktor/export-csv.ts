import type { DecimalString, Transaction } from "@portfolio/csv";
import { formatDateDe } from "./dates";
import { BROKER_LABELS, TRANSACTION_TYPE_LABELS } from "./labels";
import { ASSET_CLASS_LABELS } from "./metrics/allocation";

export const CSV_MIME_TYPE = "text/csv;charset=utf-8";
export const CSV_BOM = "\uFEFF";
export const CSV_DELIMITER = ";";
export const CSV_LINE_END = "\r\n";

const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]/;
const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

function quote(text: string): string {
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvTextCell(value: string | null): string {
  if (value === null || value === "") return "";
  return quote(FORMULA_START.test(value) ? `'${value}` : value);
}

export function csvDecimalCell(value: DecimalString | null): string {
  if (value === null || value === "") return "";
  if (!DECIMAL_STRING.test(value)) return csvTextCell(value);
  return value.replace(".", ",");
}

const COLUMNS: ReadonlyArray<readonly [header: string, cell: (t: Transaction) => string]> = [
  ["Datum", (t) => csvTextCell(formatDateDe(t.date))],
  ["Zeitstempel laut Export", (t) => csvTextCell(t.datetime)],
  ["Broker", (t) => csvTextCell(BROKER_LABELS[t.broker])],
  ["Art", (t) => csvTextCell(TRANSACTION_TYPE_LABELS[t.type])],
  ["ISIN", (t) => csvTextCell(t.isin)],
  ["Name", (t) => csvTextCell(t.name)],
  ["Kürzel", (t) => csvTextCell(t.symbol)],
  ["Assetklasse", (t) => csvTextCell(ASSET_CLASS_LABELS[t.assetClass])],
  ["Stück", (t) => csvDecimalCell(t.shares)],
  ["Kurs", (t) => csvDecimalCell(t.price)],
  ["Betrag", (t) => csvDecimalCell(t.amount)],
  ["Gebühr", (t) => csvDecimalCell(t.fee)],
  ["Steuer", (t) => csvDecimalCell(t.tax)],
  ["Währung", (t) => csvTextCell(t.currency)],
  ["Buchungsart laut Export", (t) => csvTextCell(t.rawType)],
  ["Zeile im Export", (t) => String(t.rowIndex)],
];

export const CSV_HEADERS: readonly string[] = COLUMNS.map(([header]) => header);

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const header = CSV_HEADERS.map(csvTextCell).join(CSV_DELIMITER);
  const lines = transactions.map((t) => COLUMNS.map(([, cell]) => cell(t)).join(CSV_DELIMITER));
  return `${CSV_BOM}${[header, ...lines].join(CSV_LINE_END)}${CSV_LINE_END}`;
}
