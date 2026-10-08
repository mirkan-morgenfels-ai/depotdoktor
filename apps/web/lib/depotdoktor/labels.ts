import type { BrokerId, TransactionType } from "@portfolio/csv";

export const BROKER_LABELS: Record<BrokerId, string> = {
  traderepublic: "Trade Republic",
  scalable: "Scalable Capital",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Kauf",
  sell: "Verkauf",
  dividend: "Dividende",
  interest: "Zinsen",
  fee: "Gebühr",
  tax: "Steuer",
  deposit: "Einzahlung",
  withdrawal: "Auszahlung",
  other: "Sonstiges",
};
