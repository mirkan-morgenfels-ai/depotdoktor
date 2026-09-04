import { describe, expect, test } from "vitest";
import { d } from "../money";
import { createLot, fifoSell } from "../tax/fifo";

describe("FIFO (Fall E)", () => {
  const lots = [createLot("jan", "2026-01-10", d(10), d(800)), createLot("jun", "2026-06-10", d(10), d(1000))];

  test("Verkauf 12 Anteile @ 120 €: erst 10 @ 80 (Gewinn 400), dann 2 @ 100 (Gewinn 40) = 440 €", () => {
    const sale = fifoSell(lots, d(12), d(1440));
    expect(sale.consumed.map((c) => `${c.lotId} ${c.shares.toString()} ${c.gain.toFixed(2)}`)).toEqual([
      "jan 10 400.00",
      "jun 2 40.00",
    ]);
    expect(sale.gain.toFixed(2)).toBe("440.00");
    expect(sale.cost.toFixed(2)).toBe("1000.00");
    expect(sale.remaining.map((l) => `${l.id} ${l.shares.toString()}`)).toEqual(["jun 8"]);
    expect(sale.sharesUncovered.toFixed(0)).toBe("0");
  });

  test("bereits versteuerte Vorabpauschalen mindern den Gewinn", () => {
    const taxedLots = lots.map((lot) => (lot.id === "jan" ? { ...lot, taxedVorabpauschalePerShare: d("1.5") } : lot));
    const sale = fifoSell(taxedLots, d(12), d(1440));
    expect(sale.vorabpauschaleCredit.toFixed(2)).toBe("15.00");
    expect(sale.gainBeforeCredit.toFixed(2)).toBe("440.00");
    expect(sale.gain.toFixed(2)).toBe("425.00");
  });

  test("Verkauf über Bestand: nicht gedeckte Anteile werden ausgewiesen", () => {
    const sale = fifoSell(lots, d(25), d(3000));
    expect(sale.sharesSold.toString()).toBe("20");
    expect(sale.sharesUncovered.toString()).toBe("5");
    expect(sale.remaining).toHaveLength(0);
  });

  test("Reihenfolge nach Datum, nicht nach Übergabereihenfolge", () => {
    const sale = fifoSell([lots[1]!, lots[0]!], d(5), d(600));
    expect(sale.consumed[0]?.lotId).toBe("jan");
    expect(sale.gain.toFixed(2)).toBe("200.00");
  });

  test("Verlustverkauf ergibt negativen Gewinn", () => {
    const sale = fifoSell(lots, d(10), d(700));
    expect(sale.gain.toFixed(2)).toBe("-100.00");
  });

  test("Gebühren im Kaufpreis erhöhen die Anschaffungskosten je Anteil", () => {
    const lot = createLot("x", "2026-01-01", d(3), d("301.50"));
    expect(lot.costPerShare.toFixed(2)).toBe("100.50");
  });
});
