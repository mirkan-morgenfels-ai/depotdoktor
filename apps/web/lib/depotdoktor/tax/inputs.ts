import type { FundType } from "./constants";

export type PriceField = "yearStartPrice" | "yearEndPrice";

export type PositionPriceInputs = Readonly<Partial<Record<PriceField, string>>>;

export interface TaxInputs {
  fundTypes: Readonly<Record<string, FundType>>;
  prices: Readonly<Record<number, Readonly<Record<string, PositionPriceInputs>>>>;
}

export type TaxInputAction =
  | { type: "setFundType"; positionKey: string; fundType: FundType }
  | { type: "setPrice"; year: number; positionKey: string; field: PriceField; value: string }
  | { type: "reset" };

export const EMPTY_TAX_INPUTS: TaxInputs = Object.freeze({ fundTypes: Object.freeze({}), prices: Object.freeze({}) });

export function taxInputsReducer(state: TaxInputs, action: TaxInputAction): TaxInputs {
  switch (action.type) {
    case "setFundType":
      return { ...state, fundTypes: { ...state.fundTypes, [action.positionKey]: action.fundType } };
    case "setPrice": {
      const yearPrices = state.prices[action.year] ?? {};
      const positionPrices = { ...yearPrices[action.positionKey], [action.field]: action.value };
      return { ...state, prices: { ...state.prices, [action.year]: { ...yearPrices, [action.positionKey]: positionPrices } } };
    }
    case "reset":
      return EMPTY_TAX_INPUTS;
  }
}
