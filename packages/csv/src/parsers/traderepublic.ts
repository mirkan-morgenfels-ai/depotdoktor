import type { AssetClass, BrokerParser, RowOutcome, Transaction, TransactionType } from "../types";
import {
  applySignConvention,
  cleanText,
  normalizeIsin,
  parseDate,
  parseDecimal,
} from "../normalize";

export const TRADE_REPUBLIC_REQUIRED_COLUMNS = [
  "datetime",
  "date",
  "account_type",
  "category",
  "type",
  "asset_class",
  "name",
  "shares",
  "price",
  "amount",
  "fee",
  "tax",
] as const;

const TYPE_RULES: Array<{ test: RegExp; type: TransactionType }> = [
  { test: /SAVEBACK|ROUND_?UP/, type: "buy" },
  { test: /BUY|PURCHASE|SAVINGS_PLAN/, type: "buy" },
  { test: /SELL|SALE/, type: "sell" },
  { test: /DIVIDEND|DISTRIBUTION/, type: "dividend" },
  { test: /INTEREST/, type: "interest" },
  { test: /TAX/, type: "tax" },
  { test: /FEE|COST/, type: "fee" },
  { test: /PAYIN|DEPOSIT|INCOMING|TOP_?UP/, type: "deposit" },
  { test: /PAYOUT|WITHDRAW|OUTGOING|CARD|PAYMENT/, type: "withdrawal" },
];

const ASSET_CLASS_MAP: Record<string, AssetClass> = {
  STOCK: "stock",
  EQUITY: "stock",
  ETF: "etf",
  FUND: "fund",
  BOND: "bond",
  CRYPTO: "crypto",
  DERIVATIVE: "derivative",
  WARRANT: "derivative",
  CASH: "cash",
};

function classify(category: string, rawType: string, hasSecurity: boolean): TransactionType {
  const haystack = `${category} ${rawType}`.toUpperCase();
  for (const rule of TYPE_RULES) {
    if (rule.test.test(haystack)) {
      if ((rule.type === "buy" || rule.type === "sell") && !hasSecurity) return "other";
      return rule.type;
    }
  }
  return "other";
}

function mapAssetClass(raw: string | null): AssetClass {
  if (!raw) return "unknown";
  return ASSET_CLASS_MAP[raw.trim().toUpperCase()] ?? "unknown";
}

export const tradeRepublicParser: BrokerParser = {
  id: "traderepublic",
  label: "Trade Republic (Transaktionsexport)",
  delimiter: ",",
  matchesHeader(header) {
    const set = new Set(header.map((h) => h.trim().toLowerCase()));
    return TRADE_REPUBLIC_REQUIRED_COLUMNS.every((column) => set.has(column));
  },
  parseRow(row, rowIndex): RowOutcome {
    const date = parseDate(row.date) ?? parseDate(row.datetime);
    if (!date) return { kind: "error", message: `Zeile ${rowIndex}: Datum „${row.date ?? ""}“ nicht lesbar.` };

    const category = cleanText(row.category) ?? "";
    const rawType = cleanText(row.type) ?? "";
    const isin = normalizeIsin(row.isin);
    const name = cleanText(row.name);
    const shares = parseDecimal(row.shares, "point");
    const price = parseDecimal(row.price, "point");
    const hasSecurity = shares !== null && price !== null;
    const type = classify(category, rawType, hasSecurity);

    const amountRaw = parseDecimal(row.amount, "point");
    if (amountRaw === null && type !== "other") {
      return { kind: "error", message: `Zeile ${rowIndex}: Betrag „${row.amount ?? ""}“ nicht lesbar.` };
    }
    const fee = parseDecimal(row.fee, "point") ?? "0";
    const tax = parseDecimal(row.tax, "point") ?? "0";
    const amount = applySignConvention(type, amountRaw ?? "0");

    const transaction: Transaction = {
      id: `tr-${rowIndex}`,
      broker: "traderepublic",
      rowIndex,
      date,
      datetime: cleanText(row.datetime),
      type,
      isin,
      name,
      symbol: cleanText(row.symbol),
      assetClass: mapAssetClass(cleanText(row.asset_class)),
      shares,
      price,
      amount,
      fee: fee.startsWith("-") ? fee.slice(1) : fee,
      tax: tax.startsWith("-") ? tax.slice(1) : tax,
      currency: cleanText(row.currency) ?? "EUR",
      rawType: `${category}/${rawType}`,
    };

    if (type === "other") {
      return {
        kind: "transaction",
        transaction,
        warning: `Zeile ${rowIndex}: Buchungsart „${category}/${rawType}“ unbekannt, wird nicht in Kennzahlen einbezogen.`,
      };
    }
    if ((type === "buy" || type === "sell") && !isin) {
      return {
        kind: "transaction",
        transaction,
        warning: `Zeile ${rowIndex}: ${type === "buy" ? "Kauf" : "Verkauf"} ohne ISIN, Position wird über den Namen „${name ?? "?"}“ geführt.`,
      };
    }
    return { kind: "transaction", transaction };
  },
};
