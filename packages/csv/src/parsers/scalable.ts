import type { AssetClass, BrokerParser, RowOutcome, Transaction, TransactionType } from "../types";
import {
  applySignConvention,
  cleanText,
  normalizeIsin,
  parseDate,
  parseDecimal,
} from "../normalize";

export const SCALABLE_REQUIRED_COLUMNS = [
  "date",
  "time",
  "status",
  "reference",
  "description",
  "assettype",
  "type",
  "isin",
  "shares",
  "price",
  "amount",
  "fee",
  "tax",
  "currency",
] as const;

const TYPE_RULES: Array<{ test: RegExp; type: TransactionType }> = [
  { test: /\bBUY\b|SAVINGS/, type: "buy" },
  { test: /\bSELL\b/, type: "sell" },
  { test: /DIVIDEND|DISTRIBUTION/, type: "dividend" },
  { test: /INTEREST/, type: "interest" },
  { test: /\bTAX/, type: "tax" },
  { test: /FEE|COST/, type: "fee" },
  { test: /DEPOSIT|PAY-?IN|INCOMING/, type: "deposit" },
  { test: /WITHDRAW|PAY-?OUT|OUTGOING/, type: "withdrawal" },
];

function classify(rawType: string, hasSecurity: boolean): TransactionType {
  const haystack = rawType.toUpperCase();
  for (const rule of TYPE_RULES) {
    if (rule.test.test(haystack)) {
      if ((rule.type === "buy" || rule.type === "sell") && !hasSecurity) return "other";
      return rule.type;
    }
  }
  return "other";
}

function mapAssetClass(raw: string | null, isin: string | null): AssetClass {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "CASH") return "cash";
  if (value === "CRYPTO" || value === "CRYPTOCURRENCY") return "crypto";
  if (value === "ETF") return "etf";
  if (value === "STOCK" || value === "EQUITY") return "stock";
  if (value === "BOND") return "bond";
  if (value === "SECURITY") return isin ? "unknown" : "cash";
  return "unknown";
}

export const scalableParser: BrokerParser = {
  id: "scalable",
  label: "Scalable Capital (Transaktionen-CSV)",
  delimiter: ";",
  matchesHeader(header) {
    const set = new Set(header.map((h) => h.trim().toLowerCase()));
    return SCALABLE_REQUIRED_COLUMNS.every((column) => set.has(column));
  },
  parseRow(row, rowIndex): RowOutcome {
    const status = (row.status ?? "").trim().toUpperCase();
    if (status !== "" && status !== "EXECUTED") {
      return { kind: "skip", reason: `Zeile ${rowIndex}: Status „${status}“ ist nicht ausgeführt, Zeile übersprungen.` };
    }

    const date = parseDate(row.date);
    if (!date) return { kind: "error", message: `Zeile ${rowIndex}: Datum „${row.date ?? ""}“ nicht lesbar.` };

    const rawType = cleanText(row.type) ?? "";
    const isin = normalizeIsin(row.isin);
    const shares = parseDecimal(row.shares, "comma");
    const price = parseDecimal(row.price, "comma");
    const hasSecurity = shares !== null && price !== null;
    const type = classify(rawType, hasSecurity);

    const amountRaw = parseDecimal(row.amount, "comma");
    if (amountRaw === null && type !== "other") {
      return { kind: "error", message: `Zeile ${rowIndex}: Betrag „${row.amount ?? ""}“ nicht lesbar.` };
    }
    const fee = parseDecimal(row.fee, "comma") ?? "0";
    const tax = parseDecimal(row.tax, "comma") ?? "0";
    const time = cleanText(row.time);

    const transaction: Transaction = {
      id: `sc-${rowIndex}`,
      broker: "scalable",
      rowIndex,
      date,
      datetime: time ? `${date}T${time}` : null,
      type,
      isin,
      name: cleanText(row.description),
      symbol: null,
      assetClass: mapAssetClass(cleanText(row.assettype), isin),
      shares,
      price,
      amount: applySignConvention(type, amountRaw ?? "0"),
      fee: fee.startsWith("-") ? fee.slice(1) : fee,
      tax: tax.startsWith("-") ? tax.slice(1) : tax,
      currency: cleanText(row.currency) ?? "EUR",
      rawType,
    };

    if (type === "other") {
      return {
        kind: "transaction",
        transaction,
        warning: `Zeile ${rowIndex}: Buchungsart „${rawType}“ unbekannt, wird nicht in Kennzahlen einbezogen.`,
      };
    }
    return { kind: "transaction", transaction };
  },
};
