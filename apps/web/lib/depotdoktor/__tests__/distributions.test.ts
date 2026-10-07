import { describe, expect, test } from "vitest";
import type { Transaction } from "@portfolio/csv";
import { d } from "../money";
import { buildTaxPositions, estimatePositionVorabpauschale } from "../tax/positions";
import { vorabpauschale } from "../tax/vorabpauschale";
import { TEILFREISTELLUNG } from "../tax/constants";

function tx(partial: Partial<Transaction> & Pick<Transaction, "date" | "type" | "amount">): Transaction {
  return {
    id: `${partial.date}-${partial.type}`,
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: "IE00TEST0001",
    name: "Testfonds Welt UCITS ETF",
    symbol: null,
    assetClass: "etf",
    shares: null,
    price: null,
    fee: "0",
    tax: "0",
    currency: "EUR",
    rawType: partial.type,
    ...partial,
  };
}

const buy2025 = tx({ id: "a", date: "2025-03-03", type: "buy", amount: "-10000", shares: "100", price: "100" });
const prices = { yearStartPrice: d(100), yearEndPrice: d(120) };

describe("Ausschüttungen brutto nach § 2 Abs. 11 InvStG", () => {
  test("Basisertrag 100 × 100 × 3,2 % × 0,7 = 224,00 €; Ausschüttung netto 122,31 € plus Steuerabzug 27,69 € = 150,00 € brutto; 224,00 − 150,00 = 74,00 €", () => {
    const distribution = tx({ id: "b", date: "2026-06-15", type: "dividend", amount: "122.31", tax: "27.69" });
    const [position] = buildTaxPositions([buy2025, distribution], 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("150.00");
    const estimate = estimatePositionVorabpauschale(position!, 2026, "equity", prices);
    expect(estimate?.parts[0]?.result.basisertrag.toFixed(2)).toBe("224.00");
    expect(estimate?.vorabpauschale.toFixed(2)).toBe("74.00");
  });

  test("Gegenfall ohne Steuerabzug: 150,00 € Ausschüttung ergeben unverändert 224,00 − 150,00 = 74,00 €", () => {
    const distribution = tx({ id: "b", date: "2026-06-15", type: "dividend", amount: "150.00", tax: "0" });
    const [position] = buildTaxPositions([buy2025, distribution], 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("150.00");
    expect(estimatePositionVorabpauschale(position!, 2026, "equity", prices)?.vorabpauschale.toFixed(2)).toBe("74.00");
  });

  test("Steuerabzug mit negativem Vorzeichen im Export zählt ebenfalls zum Bruttobetrag: 122,31 + |−27,69| = 150,00 €", () => {
    const distribution = tx({ id: "b", date: "2026-06-15", type: "dividend", amount: "122.31", tax: "-27.69" });
    const [position] = buildTaxPositions([buy2025, distribution], 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("150.00");
  });

  test("Ausschüttungen eines anderen Jahres zählen nicht: 2025 gebuchte 40 € mindern den Basisertrag 2026 nicht", () => {
    const distribution = tx({ id: "b", date: "2025-11-15", type: "dividend", amount: "30", tax: "10" });
    const [position] = buildTaxPositions([buy2025, distribution], 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("0.00");
    expect(estimatePositionVorabpauschale(position!, 2026, "equity", prices)?.vorabpauschale.toFixed(2)).toBe("224.00");
  });
});

describe("Ausschüttungen je Anteil zum Zahltag (§ 18 Abs. 1 InvStG)", () => {
  const prices110 = { yearStartPrice: d(100), yearEndPrice: d(110) };
  const buy200 = tx({ id: "a", date: "2025-02-03", type: "buy", amount: "-20000", shares: "200", price: "100" });
  const sellHalf = tx({ id: "c", date: "2026-06-01", type: "sell", amount: "10500", shares: "100", price: "105" });

  test("Ausschüttung vor Teilverkauf: 200 € auf 200 Anteile = 1,00 € je Anteil; Bestand 100 × (100 × 3,2 % × 0,7 − 1,00) = 124,00 €, nicht 100 × (2,24 − 200/100) = 24,00 €", () => {
    const distribution = tx({ id: "b", date: "2026-03-16", type: "dividend", amount: "200", shares: "200" });
    const [position] = buildTaxPositions([buy200, distribution, sellHalf], 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("200.00");
    expect(position?.distributionsOnYearEndHoldings.toFixed(2)).toBe("100.00");
    expect(position?.lotsHeldAtYearStart.map((l) => `${l.shares.toString()} ${l.distributionsPerShareInYear.toFixed(2)}`)).toEqual([
      "100 1.00",
    ]);
    expect(estimatePositionVorabpauschale(position!, 2026, "equity", prices110)?.vorabpauschale.toFixed(2)).toBe("124.00");
  });

  test("ohne Stückzahl in der Ausschüttungsbuchung zählen die am Zahltag gehaltenen Anteile: 200 € / 200 = 1,00 €, wieder 124,00 €", () => {
    const distribution = tx({ id: "b", date: "2026-03-16", type: "dividend", amount: "200" });
    const [position] = buildTaxPositions([buy200, distribution, sellHalf], 2026);
    expect(position?.distributionsOnYearEndHoldings.toFixed(2)).toBe("100.00");
    expect(estimatePositionVorabpauschale(position!, 2026, "equity", prices110)?.vorabpauschale.toFixed(2)).toBe("124.00");
  });

  test("Ausschüttung vor Nachkauf: Bestand 100 × (2,24 − 1,00) = 124,00 €, Septemberkauf ohne Ausschüttung 100 × 2,24 × 4/12 = 74,67 €, zusammen 198,67 € statt 174,00 + 58,00 = 232,00 €", () => {
    const transactions = [
      tx({ id: "a", date: "2025-02-03", type: "buy", amount: "-10000", shares: "100", price: "100" }),
      tx({ id: "b", date: "2026-03-16", type: "dividend", amount: "100", shares: "100" }),
      tx({ id: "c", date: "2026-09-10", type: "buy", amount: "-10500", shares: "100", price: "105" }),
    ];
    const [position] = buildTaxPositions(transactions, 2026);
    expect(position?.distributionsInYear.toFixed(2)).toBe("100.00");
    expect(position?.distributionsOnYearEndHoldings.toFixed(2)).toBe("100.00");
    const estimate = estimatePositionVorabpauschale(position!, 2026, "equity", prices110);
    expect(estimate?.parts.map((p) => `${p.label} ${p.monthsBeforeAcquisition} ${p.result.vorabpauschale.toFixed(2)}`)).toEqual([
      "Bestand am Jahresanfang 0 124.00",
      "Kauf 2026-09-10 8 74.67",
    ]);
    expect(estimate?.vorabpauschale.toFixed(2)).toBe("198.67");
  });

  test("Ausschüttung mit Steuerabzug nach Kauf im Jahr: (73,63 + 26,37) / 100 = 1,00 € je Anteil; Januarkauf 100 × (2,24 − 1,00) = 124,00 €", () => {
    const transactions = [
      tx({ id: "a", date: "2026-01-12", type: "buy", amount: "-10000", shares: "100", price: "100" }),
      tx({ id: "b", date: "2026-03-16", type: "dividend", amount: "73.63", tax: "26.37", shares: "100" }),
    ];
    const [position] = buildTaxPositions(transactions, 2026);
    expect(position?.lotsBoughtInYear.map((l) => l.distributionsPerShareInYear.toFixed(2))).toEqual(["1.00"]);
    expect(estimatePositionVorabpauschale(position!, 2026, "equity", prices110)?.vorabpauschale.toFixed(2)).toBe("124.00");
  });
});

describe("Reihenfolge Ausschüttung und Deckel (README-Formel)", () => {
  test("Basisertrag 224 €, Wertzuwachs 150 €, Ausschüttungen 100 €: min(224 − 100, 150) = 124,00 €, nicht min(224, 150) − 100 = 50 €", () => {
    const r = vorabpauschale({
      referenceValue: d(10000),
      basiszins: d("0.032"),
      gain: d(150),
      distributions: d(100),
      teilfreistellung: TEILFREISTELLUNG.equity,
    });
    expect(r.basisertrag.toFixed(2)).toBe("224.00");
    expect(r.vorabpauschale.toFixed(2)).toBe("124.00");
    expect(r.capApplied).toBe(false);
  });
});
