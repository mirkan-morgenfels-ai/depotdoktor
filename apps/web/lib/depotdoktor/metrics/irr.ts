export interface Cashflow {
  t: number;
  amount: number;
}

export type IrrResult =
  | { ok: true; rate: number; method: "newton" | "bisection"; iterations: number }
  | { ok: false; reason: "no-cashflows" | "no-sign-change" | "no-duration" | "no-convergence" };

export function npv(rate: number, cashflows: readonly Cashflow[]): number {
  return cashflows.reduce((acc, cf) => acc + cf.amount / Math.pow(1 + rate, cf.t), 0);
}

export function npvDerivative(rate: number, cashflows: readonly Cashflow[]): number {
  return cashflows.reduce((acc, cf) => acc - (cf.t * cf.amount) / Math.pow(1 + rate, cf.t + 1), 0);
}

function hasSignChange(cashflows: readonly Cashflow[]): boolean {
  let sawNegative = false;
  let sawPositive = false;
  for (const cf of cashflows) {
    if (cf.amount < 0) sawNegative = true;
    if (cf.amount > 0) sawPositive = true;
  }
  return sawNegative && sawPositive;
}

function hasDuration(cashflows: readonly Cashflow[]): boolean {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const cf of cashflows) {
    if (cf.t < min) min = cf.t;
    if (cf.t > max) max = cf.t;
  }
  return max - min > 0;
}

export function irr(
  cashflows: readonly Cashflow[],
  options: { guess?: number; tolerance?: number; maxIterations?: number } = {},
): IrrResult {
  const guess = options.guess ?? 0.1;
  const tolerance = options.tolerance ?? 1e-9;
  const maxIterations = options.maxIterations ?? 100;

  if (cashflows.length === 0) return { ok: false, reason: "no-cashflows" };
  if (!hasSignChange(cashflows)) return { ok: false, reason: "no-sign-change" };
  if (!hasDuration(cashflows)) return { ok: false, reason: "no-duration" };

  let rate = guess;
  for (let i = 1; i <= maxIterations; i += 1) {
    const f = npv(rate, cashflows);
    if (Math.abs(f) < tolerance) return { ok: true, rate, method: "newton", iterations: i };
    const df = npvDerivative(rate, cashflows);
    if (!Number.isFinite(df) || Math.abs(df) < 1e-14) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < tolerance) return { ok: true, rate: next, method: "newton", iterations: i };
    rate = next;
  }

  return bisection(cashflows, tolerance);
}

function bisection(cashflows: readonly Cashflow[], tolerance: number): IrrResult {
  let low = -0.9999;
  let high = 10;
  let fLow = npv(low, cashflows);
  let fHigh = npv(high, cashflows);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh) || fLow * fHigh > 0) {
    return { ok: false, reason: "no-convergence" };
  }
  for (let i = 1; i <= 500; i += 1) {
    const mid = (low + high) / 2;
    const fMid = npv(mid, cashflows);
    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return { ok: true, rate: mid, method: "bisection", iterations: i };
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return { ok: false, reason: "no-convergence" };
}
