import { Decimal, ZERO } from "../money";

export interface Lot {
  id: string;
  date: string;
  shares: Decimal;
  costPerShare: Decimal;
  taxedVorabpauschalePerShare: Decimal;
  distributionsPerShareInYear: Decimal;
}

export interface LotConsumption {
  lotId: string;
  date: string;
  shares: Decimal;
  cost: Decimal;
  proceeds: Decimal;
  vorabpauschaleCredit: Decimal;
  gain: Decimal;
}

export interface FifoSaleResult {
  consumed: LotConsumption[];
  remaining: Lot[];
  sharesSold: Decimal;
  sharesUncovered: Decimal;
  proceeds: Decimal;
  cost: Decimal;
  vorabpauschaleCredit: Decimal;
  gainBeforeCredit: Decimal;
  gain: Decimal;
}

export function createLot(id: string, date: string, shares: Decimal, totalCost: Decimal): Lot {
  return {
    id,
    date,
    shares,
    costPerShare: shares.gt(ZERO) ? totalCost.div(shares) : ZERO,
    taxedVorabpauschalePerShare: ZERO,
    distributionsPerShareInYear: ZERO,
  };
}

export function fifoSell(lots: readonly Lot[], sharesToSell: Decimal, totalProceeds: Decimal): FifoSaleResult {
  const sorted = [...lots].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const proceedsPerShare = sharesToSell.gt(ZERO) ? totalProceeds.div(sharesToSell) : ZERO;
  const consumed: LotConsumption[] = [];
  const remaining: Lot[] = [];
  let open = sharesToSell;

  for (const lot of sorted) {
    if (open.lte(ZERO)) {
      remaining.push(lot);
      continue;
    }
    const take = Decimal.min(lot.shares, open);
    const cost = take.times(lot.costPerShare);
    const proceeds = take.times(proceedsPerShare);
    const credit = take.times(lot.taxedVorabpauschalePerShare);
    consumed.push({
      lotId: lot.id,
      date: lot.date,
      shares: take,
      cost,
      proceeds,
      vorabpauschaleCredit: credit,
      gain: proceeds.minus(cost).minus(credit),
    });
    open = open.minus(take);
    const left = lot.shares.minus(take);
    if (left.gt(ZERO)) remaining.push({ ...lot, shares: left });
  }

  const cost = consumed.reduce((acc, c) => acc.plus(c.cost), ZERO);
  const proceeds = consumed.reduce((acc, c) => acc.plus(c.proceeds), ZERO);
  const credit = consumed.reduce((acc, c) => acc.plus(c.vorabpauschaleCredit), ZERO);
  const gainBeforeCredit = proceeds.minus(cost);

  return {
    consumed,
    remaining,
    sharesSold: sharesToSell.minus(open),
    sharesUncovered: open,
    proceeds,
    cost,
    vorabpauschaleCredit: credit,
    gainBeforeCredit,
    gain: gainBeforeCredit.minus(credit),
  };
}
