import type { AssetClass, Transaction } from "@portfolio/csv";
import { Decimal, ZERO, d } from "./money";
import type { ValuationPoint } from "./metrics/ttwror";
import type { Cashflow } from "./metrics/irr";
import { yearFraction } from "./dates";

export interface Position {
  key: string;
  isin: string | null;
  name: string;
  assetClass: AssetClass;
  shares: Decimal;
  lastPrice: Decimal | null;
  lastPriceDate: string | null;
  value: Decimal;
  costBasis: Decimal;
}

export interface PortfolioTotals {
  invested: Decimal;
  proceeds: Decimal;
  dividends: Decimal;
  fees: Decimal;
  taxes: Decimal;
  deposits: Decimal;
  withdrawals: Decimal;
  interest: Decimal;
  endValue: Decimal;
}

export interface PortfolioSnapshot {
  points: ValuationPoint[];
  positions: Position[];
  cashflows: Cashflow[];
  totals: PortfolioTotals;
  firstDate: string | null;
  lastDate: string | null;
  notes: string[];
}

export function positionKey(transaction: Pick<Transaction, "isin" | "name">): string {
  return transaction.isin ?? `name:${transaction.name ?? "unbekannt"}`;
}

interface MutablePosition {
  key: string;
  isin: string | null;
  name: string;
  assetClass: AssetClass;
  shares: Decimal;
  lastPrice: Decimal | null;
  lastPriceDate: string | null;
  costBasis: Decimal;
}

export function buildPortfolio(transactions: readonly Transaction[]): PortfolioSnapshot {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.rowIndex - b.rowIndex);
  const positions = new Map<string, MutablePosition>();
  const points: ValuationPoint[] = [];
  const flowsByDate: Array<{ date: string; flow: Decimal }> = [];
  const notes: string[] = [];
  const totals: PortfolioTotals = {
    invested: ZERO,
    proceeds: ZERO,
    dividends: ZERO,
    fees: ZERO,
    taxes: ZERO,
    deposits: ZERO,
    withdrawals: ZERO,
    interest: ZERO,
    endValue: ZERO,
  };

  let index = 0;
  while (index < sorted.length) {
    const date = sorted[index]!.date;
    let flow = ZERO;
    while (index < sorted.length && sorted[index]!.date === date) {
      const tx = sorted[index]!;
      index += 1;
      const amount = d(tx.amount);
      const fee = d(tx.fee);
      const tax = d(tx.tax);

      switch (tx.type) {
        case "buy": {
          const position = ensurePosition(positions, tx);
          const shares = d(tx.shares);
          position.shares = position.shares.plus(shares);
          position.costBasis = position.costBasis.plus(amount.abs());
          if (tx.price) {
            position.lastPrice = d(tx.price);
            position.lastPriceDate = tx.date;
          }
          flow = flow.plus(amount.abs());
          totals.invested = totals.invested.plus(amount.abs());
          totals.fees = totals.fees.plus(fee);
          break;
        }
        case "sell": {
          const position = ensurePosition(positions, tx);
          const shares = d(tx.shares);
          if (shares.gt(position.shares)) {
            notes.push(
              `${tx.date}: Verkauf von ${shares.toString()} Anteilen „${position.name}“, aber nur ${position.shares.toString()} im Bestand. Der Export ist vermutlich unvollständig; Bestand wird auf 0 gesetzt.`,
            );
          }
          const soldFraction = position.shares.gt(ZERO) ? Decimal.min(shares, position.shares).div(position.shares) : ZERO;
          position.costBasis = position.costBasis.minus(position.costBasis.times(soldFraction));
          position.shares = Decimal.max(position.shares.minus(shares), ZERO);
          if (tx.price) {
            position.lastPrice = d(tx.price);
            position.lastPriceDate = tx.date;
          }
          flow = flow.minus(amount.abs());
          totals.proceeds = totals.proceeds.plus(amount.abs());
          totals.fees = totals.fees.plus(fee);
          totals.taxes = totals.taxes.plus(tax);
          break;
        }
        case "dividend": {
          flow = flow.minus(amount.abs());
          totals.dividends = totals.dividends.plus(amount.abs());
          totals.taxes = totals.taxes.plus(tax);
          break;
        }
        case "fee": {
          flow = flow.plus(amount.abs());
          totals.fees = totals.fees.plus(amount.abs());
          break;
        }
        case "tax": {
          flow = flow.plus(amount.abs());
          totals.taxes = totals.taxes.plus(amount.abs());
          break;
        }
        case "deposit":
          totals.deposits = totals.deposits.plus(amount.abs());
          break;
        case "withdrawal":
          totals.withdrawals = totals.withdrawals.plus(amount.abs());
          break;
        case "interest":
          totals.interest = totals.interest.plus(amount.abs());
          break;
        case "other":
          break;
      }
    }

    const value = valueOf(positions);
    points.push({ date, value, flow });
    flowsByDate.push({ date, flow });
  }

  const firstDate = points[0]?.date ?? null;
  const lastDate = points[points.length - 1]?.date ?? null;
  const endValue = points[points.length - 1]?.value ?? ZERO;
  totals.endValue = endValue;

  const cashflows: Cashflow[] = [];
  if (firstDate && lastDate) {
    for (const entry of flowsByDate) {
      if (entry.flow.isZero()) continue;
      cashflows.push({ t: yearFraction(firstDate, entry.date), amount: entry.flow.negated().toNumber() });
    }
    if (endValue.gt(ZERO)) {
      cashflows.push({ t: yearFraction(firstDate, lastDate), amount: endValue.toNumber() });
    }
  }

  const openPositions: Position[] = [...positions.values()]
    .filter((p) => p.shares.gt(ZERO))
    .map((p) => ({
      ...p,
      value: p.lastPrice ? p.shares.times(p.lastPrice) : ZERO,
    }))
    .sort((a, b) => b.value.comparedTo(a.value));

  for (const position of openPositions) {
    if (!position.lastPrice) {
      notes.push(`Position „${position.name}“ hat keinen Kurs im Export und wird mit 0 € bewertet.`);
    }
  }

  return { points, positions: openPositions, cashflows, totals, firstDate, lastDate, notes };
}

function ensurePosition(positions: Map<string, MutablePosition>, tx: Transaction): MutablePosition {
  const key = positionKey(tx);
  const existing = positions.get(key);
  if (existing) {
    if (existing.assetClass === "unknown" && tx.assetClass !== "unknown") existing.assetClass = tx.assetClass;
    return existing;
  }
  const created: MutablePosition = {
    key,
    isin: tx.isin,
    name: tx.name ?? tx.isin ?? "Unbekannt",
    assetClass: tx.assetClass,
    shares: ZERO,
    lastPrice: null,
    lastPriceDate: null,
    costBasis: ZERO,
  };
  positions.set(key, created);
  return created;
}

function valueOf(positions: Map<string, MutablePosition>): Decimal {
  let total = ZERO;
  for (const position of positions.values()) {
    if (position.shares.gt(ZERO) && position.lastPrice) {
      total = total.plus(position.shares.times(position.lastPrice));
    }
  }
  return total;
}
