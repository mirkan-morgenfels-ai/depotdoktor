import type { AssetClass } from "@portfolio/csv";
import { Decimal, ZERO } from "../money";

export interface AllocationInput {
  key: string;
  name: string;
  isin: string | null;
  assetClass: AssetClass;
  value: Decimal;
}

export interface AllocationSlice {
  label: string;
  value: Decimal;
  share: Decimal;
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock: "Aktien",
  etf: "ETF",
  fund: "Fonds",
  bond: "Anleihen",
  crypto: "Krypto",
  derivative: "Derivate",
  cash: "Cash",
  unknown: "Nicht zugeordnet",
};

const REGION_BY_COUNTRY: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  FR: "Frankreich",
  NL: "Niederlande",
  IE: "Irland (Fondsdomizil)",
  LU: "Luxemburg (Fondsdomizil)",
  GB: "Vereinigtes Königreich",
  US: "USA",
  CA: "Kanada",
  JP: "Japan",
  KY: "Kaimaninseln",
  JE: "Jersey",
};

export function regionOfIsin(isin: string | null): string {
  if (!isin) return "Ohne ISIN";
  const country = isin.slice(0, 2);
  return REGION_BY_COUNTRY[country] ?? `Sonstige (${country})`;
}

function groupBy(inputs: readonly AllocationInput[], labelOf: (input: AllocationInput) => string): AllocationSlice[] {
  const totals = new Map<string, Decimal>();
  for (const input of inputs) {
    if (input.value.lte(ZERO)) continue;
    const label = labelOf(input);
    totals.set(label, (totals.get(label) ?? ZERO).plus(input.value));
  }
  const total = [...totals.values()].reduce((acc, v) => acc.plus(v), ZERO);
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value, share: total.gt(ZERO) ? value.div(total) : ZERO }))
    .sort((a, b) => b.value.comparedTo(a.value));
}

export function allocationByAssetClass(inputs: readonly AllocationInput[]): AllocationSlice[] {
  return groupBy(inputs, (input) => ASSET_CLASS_LABELS[input.assetClass]);
}

export function allocationByRegion(inputs: readonly AllocationInput[]): AllocationSlice[] {
  return groupBy(inputs, (input) => regionOfIsin(input.isin));
}

export function allocationByPosition(inputs: readonly AllocationInput[]): AllocationSlice[] {
  return groupBy(inputs, (input) => input.name);
}
