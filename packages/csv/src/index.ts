import Papa from "papaparse";
import { detectBroker, firstLine, splitHeaderLine, stripBom, BROKER_PARSERS } from "./detect";
import type { ParseResult, ParseWarning, Transaction } from "./types";

export type {
  AssetClass,
  BrokerId,
  BrokerParser,
  DecimalString,
  ParseFailure,
  ParseResult,
  ParseSuccess,
  ParseWarning,
  RowOutcome,
  Transaction,
  TransactionType,
} from "./types";
export { detectBroker, BROKER_PARSERS } from "./detect";
export { parseDecimal, parseDate, normalizeIsin, normalizeDecimalString } from "./normalize";
export { tradeRepublicParser, TRADE_REPUBLIC_REQUIRED_COLUMNS } from "./parsers/traderepublic";
export { scalableParser, SCALABLE_REQUIRED_COLUMNS } from "./parsers/scalable";

export const UNKNOWN_FORMAT_MESSAGE =
  "Das CSV-Format wurde nicht erkannt. Unterstützt werden der Transaktionsexport von Trade Republic und die Transaktionen-CSV von Scalable Capital. Bitte prüfen Sie, ob die erste Zeile der Datei die Spaltenüberschriften enthält.";

export const EMPTY_FILE_MESSAGE = "Die Datei ist leer.";

export function parseBrokerCsv(input: string): ParseResult {
  const text = stripBom(input);
  if (text.trim() === "") return { ok: false, error: EMPTY_FILE_MESSAGE };

  const detected = detectBroker(text);
  if (!detected) {
    const { columns } = splitHeaderLine(firstLine(text));
    const preview = columns.slice(0, 6).join(", ");
    const known = BROKER_PARSERS.map((p) => p.label).join(", ");
    return {
      ok: false,
      error: `${UNKNOWN_FORMAT_MESSAGE} Gefundene Spalten: ${preview}${columns.length > 6 ? ", …" : ""}. Bekannte Formate: ${known}.`,
    };
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: detected.delimiter,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const fatal = parsed.errors.filter((e) => e.code !== "TooFewFields" && e.code !== "TooManyFields");
  if (fatal.length > 0 && parsed.data.length === 0) {
    return { ok: false, error: `Die Datei konnte nicht gelesen werden: ${fatal[0]?.message ?? "unbekannter Fehler"}.` };
  }

  const transactions: Transaction[] = [];
  const warnings: ParseWarning[] = [];
  let skippedRows = 0;

  parsed.data.forEach((row, index) => {
    const rowIndex = index + 2;
    const outcome = detected.parser.parseRow(row, rowIndex);
    if (outcome.kind === "transaction") {
      transactions.push(outcome.transaction);
      if (outcome.warning) warnings.push({ rowIndex, message: outcome.warning });
    } else if (outcome.kind === "skip") {
      skippedRows += 1;
      warnings.push({ rowIndex, message: outcome.reason });
    } else {
      skippedRows += 1;
      warnings.push({ rowIndex, message: outcome.message });
    }
  });

  transactions.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    const at = a.datetime ?? "";
    const bt = b.datetime ?? "";
    const byTime = at.localeCompare(bt);
    if (byTime !== 0) return byTime;
    return a.rowIndex - b.rowIndex;
  });

  return { ok: true, broker: detected.broker, transactions, warnings, skippedRows };
}
