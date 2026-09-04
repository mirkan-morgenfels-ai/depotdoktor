import { Decimal, ZERO } from "../money";
import { ABGELTUNGSTEUER_RATE, BASISERTRAG_FACTOR } from "./constants";

export type ReductionTarget = "basisertrag" | "vorabpauschale";

export interface VorabpauschaleInput {
  referenceValue: Decimal;
  basiszins: Decimal;
  gain: Decimal;
  distributions?: Decimal;
  teilfreistellung: Decimal;
  monthsBeforeAcquisition?: number;
  taxRate?: Decimal;
  reductionTarget?: ReductionTarget;
}

export interface VorabpauschaleResult {
  basisertrag: Decimal;
  basisertragAfterDistributions: Decimal;
  vorabpauschale: Decimal;
  taxable: Decimal;
  tax: Decimal;
  capApplied: boolean;
  monthsFactor: Decimal;
}

export function vorabpauschale(input: VorabpauschaleInput): VorabpauschaleResult {
  const months = input.monthsBeforeAcquisition ?? 0;
  if (months < 0 || months > 11 || !Number.isInteger(months)) {
    throw new RangeError(`monthsBeforeAcquisition muss zwischen 0 und 11 liegen, erhalten: ${months}`);
  }
  const monthsFactor = new Decimal(12 - months).div(12);
  const target = input.reductionTarget ?? "basisertrag";
  const distributions = input.distributions ?? ZERO;
  const taxRate = input.taxRate ?? ABGELTUNGSTEUER_RATE;

  const fullBasisertrag = input.referenceValue.times(input.basiszins).times(BASISERTRAG_FACTOR);
  const basisertrag = target === "basisertrag" ? fullBasisertrag.times(monthsFactor) : fullBasisertrag;
  const afterDistributions = Decimal.max(basisertrag.minus(distributions), ZERO);
  const capApplied = input.gain.lt(afterDistributions);
  let pauschale = Decimal.max(Decimal.min(afterDistributions, input.gain), ZERO);
  if (target === "vorabpauschale") pauschale = pauschale.times(monthsFactor);

  const taxable = pauschale.times(new Decimal(1).minus(input.teilfreistellung));
  const tax = taxable.times(taxRate);

  return {
    basisertrag,
    basisertragAfterDistributions: afterDistributions,
    vorabpauschale: pauschale,
    taxable,
    tax,
    capApplied,
    monthsFactor,
  };
}
