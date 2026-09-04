export type BrokerId = "traderepublic" | "scalable";

export type TransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "fee"
  | "tax"
  | "deposit"
  | "withdrawal"
  | "other";

export type AssetClass = "stock" | "etf" | "fund" | "bond" | "crypto" | "derivative" | "cash" | "unknown";

export type DecimalString = string;

export interface Transaction {
  id: string;
  broker: BrokerId;
  rowIndex: number;
  date: string;
  datetime: string | null;
  type: TransactionType;
  isin: string | null;
  name: string | null;
  symbol: string | null;
  assetClass: AssetClass;
  shares: DecimalString | null;
  price: DecimalString | null;
  amount: DecimalString;
  fee: DecimalString;
  tax: DecimalString;
  currency: string;
  rawType: string;
}

export interface ParseWarning {
  rowIndex: number;
  message: string;
}

export interface ParseSuccess {
  ok: true;
  broker: BrokerId;
  transactions: Transaction[];
  warnings: ParseWarning[];
  skippedRows: number;
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

export interface BrokerParser {
  id: BrokerId;
  label: string;
  delimiter: "," | ";";
  matchesHeader: (header: string[]) => boolean;
  parseRow: (row: Record<string, string>, rowIndex: number) => RowOutcome;
}

export type RowOutcome =
  | { kind: "transaction"; transaction: Transaction; warning?: string }
  | { kind: "skip"; reason: string }
  | { kind: "error"; message: string };
