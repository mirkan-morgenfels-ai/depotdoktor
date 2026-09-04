import type { Transaction } from "@portfolio/csv";

export const NORMALIZED_CSV_COLUMNS = [
  "date",
  "datetime",
  "broker",
  "type",
  "isin",
  "name",
  "symbol",
  "asset_class",
  "shares",
  "price",
  "amount",
  "fee",
  "tax",
  "currency",
  "raw_type",
  "source_row",
] as const;

function escapeCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const header = NORMALIZED_CSV_COLUMNS.join(";");
  const lines = transactions.map((t) =>
    [
      t.date,
      t.datetime,
      t.broker,
      t.type,
      t.isin,
      t.name,
      t.symbol,
      t.assetClass,
      t.shares,
      t.price,
      t.amount,
      t.fee,
      t.tax,
      t.currency,
      t.rawType,
      t.rowIndex,
    ]
      .map(escapeCell)
      .join(";"),
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}\r\n`;
}
