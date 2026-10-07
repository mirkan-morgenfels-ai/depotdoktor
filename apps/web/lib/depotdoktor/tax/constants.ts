import { Decimal } from "../money";

export type FundType = "equity" | "mixed" | "realEstate" | "realEstateForeign" | "other" | "none";

export const FUND_TYPE_LABELS: Record<FundType, string> = {
  equity: "Aktienfonds (Teilfreistellung 30 %)",
  mixed: "Mischfonds (Teilfreistellung 15 %)",
  realEstate: "Immobilienfonds (Teilfreistellung 60 %)",
  realEstateForeign: "Auslands-Immobilienfonds (Teilfreistellung 80 %)",
  other: "Sonstiger Fonds (keine Teilfreistellung)",
  none: "Kein Fonds (Aktie, Anleihe)",
};

export const TEILFREISTELLUNG: Record<FundType, Decimal> = {
  equity: new Decimal("0.30"),
  mixed: new Decimal("0.15"),
  realEstate: new Decimal("0.60"),
  realEstateForeign: new Decimal("0.80"),
  other: new Decimal("0"),
  none: new Decimal("0"),
};

export const BASISZINS: Record<number, Decimal> = {
  2025: new Decimal("0.0253"),
  2026: new Decimal("0.032"),
};

export const BASISERTRAG_FACTOR = new Decimal("0.7");

export const KAPITALERTRAGSTEUER = new Decimal("0.25");
export const SOLIDARITAETSZUSCHLAG = new Decimal("0.055");
export const ABGELTUNGSTEUER_RATE = KAPITALERTRAGSTEUER.times(new Decimal(1).plus(SOLIDARITAETSZUSCHLAG));

export const SPARERPAUSCHBETRAG_SINGLE = new Decimal("1000");
export const SPARERPAUSCHBETRAG_JOINT = new Decimal("2000");

export function basiszinsFor(year: number): Decimal | null {
  return BASISZINS[year] ?? null;
}
