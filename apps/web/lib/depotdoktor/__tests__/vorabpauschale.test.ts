import { describe, expect, test } from "vitest";
import { d } from "../money";
import { vorabpauschale } from "../tax/vorabpauschale";
import { ABGELTUNGSTEUER_RATE, basiszinsFor, TEILFREISTELLUNG } from "../tax/constants";

const equity = TEILFREISTELLUNG.equity;
const zins2026 = d("0.032");

describe("Konstanten", () => {
  test("Abgeltungsteuer mit Soli: 25 % × 1,055 = 26,375 %", () => {
    expect(ABGELTUNGSTEUER_RATE.toFixed(5)).toBe("0.26375");
  });

  test("Basiszins 2026 = 3,20 %, 2025 = 2,53 %, andere Jahre unbekannt", () => {
    expect(basiszinsFor(2026)?.toFixed(4)).toBe("0.0320");
    expect(basiszinsFor(2025)?.toFixed(4)).toBe("0.0253");
    expect(basiszinsFor(2020)).toBeNull();
  });
});

describe("Vorabpauschale 2026 (Abschnitt 1.3.4)", () => {
  test("Fall A Normalfall: 10.000 € Jahresanfang, Wertzuwachs 1.500 €", () => {
    const r = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(1500), teilfreistellung: equity });
    expect(r.basisertrag.toFixed(2)).toBe("224.00");
    expect(r.vorabpauschale.toFixed(2)).toBe("224.00");
    expect(r.taxable.toFixed(2)).toBe("156.80");
    expect(r.tax.toFixed(2)).toBe("41.36");
    expect(r.capApplied).toBe(false);
  });

  test("Fall B Wertzuwachs 150 € unter Basisertrag: Deckel greift", () => {
    const r = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(150), teilfreistellung: equity });
    expect(r.basisertrag.toFixed(2)).toBe("224.00");
    expect(r.vorabpauschale.toFixed(2)).toBe("150.00");
    expect(r.taxable.toFixed(2)).toBe("105.00");
    expect(r.tax.toFixed(2)).toBe("27.69");
    expect(r.capApplied).toBe(true);
  });

  test("Fall C Verlustjahr: Vorabpauschale 0 €, keine Steuer", () => {
    const r = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(-800), teilfreistellung: equity });
    expect(r.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(r.tax.toFixed(2)).toBe("0.00");
  });

  test("Fall C Grenzfall: Wertzuwachs genau 0", () => {
    const r = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(0), teilfreistellung: equity });
    expect(r.vorabpauschale.toFixed(2)).toBe("0.00");
  });

  test("Fall D unterjähriger Kauf im Juli nach § 18 Abs. 2 InvStG: Basisertrag 224 €, Vorabpauschale 224 × 6/12 = 112 €", () => {
    const r = vorabpauschale({
      referenceValue: d(10000),
      basiszins: zins2026,
      gain: d(1500),
      teilfreistellung: equity,
      monthsBeforeAcquisition: 6,
    });
    expect(r.monthsFactor.toFixed(4)).toBe("0.5000");
    expect(r.basisertrag.toFixed(2)).toBe("224.00");
    expect(r.vorabpauschale.toFixed(2)).toBe("112.00");
    expect(r.taxable.toFixed(2)).toBe("78.40");
    expect(r.tax.toFixed(2)).toBe("20.68");
  });

  test("Fall D Standard nach Gesetzeswortlaut mit greifendem Deckel: min(224, 150) × 6/12 = 75,00 €", () => {
    const r = vorabpauschale({
      referenceValue: d(10000),
      basiszins: zins2026,
      gain: d(150),
      teilfreistellung: equity,
      monthsBeforeAcquisition: 6,
    });
    expect(r.basisertrag.toFixed(2)).toBe("224.00");
    expect(r.capApplied).toBe(true);
    expect(r.vorabpauschale.toFixed(2)).toBe("75.00");
    expect(r.taxable.toFixed(2)).toBe("52.50");
    expect(r.tax.toFixed(2)).toBe("13.85");
  });

  test("Fall D Variante 'basisertrag' (ursprüngliche Spezifikation): 224 × 6/12 = 112 €, Deckel 150 € greift nicht, 112,00 €", () => {
    const r = vorabpauschale({
      referenceValue: d(10000),
      basiszins: zins2026,
      gain: d(150),
      teilfreistellung: equity,
      monthsBeforeAcquisition: 6,
      reductionTarget: "basisertrag",
    });
    expect(r.basisertrag.toFixed(2)).toBe("112.00");
    expect(r.capApplied).toBe(false);
    expect(r.vorabpauschale.toFixed(2)).toBe("112.00");
  });

  test("Fall D beide Varianten gleich, solange der Deckel nicht greift: 112,00 €", () => {
    const common = { referenceValue: d(10000), basiszins: zins2026, teilfreistellung: equity, monthsBeforeAcquisition: 6, gain: d(1500) };
    expect(vorabpauschale({ ...common, reductionTarget: "basisertrag" }).vorabpauschale.toFixed(2)).toBe("112.00");
    expect(vorabpauschale({ ...common, reductionTarget: "vorabpauschale" }).vorabpauschale.toFixed(2)).toBe("112.00");
  });

  test("Fall D nach Gesetz mit Ausschüttung: (224 − 100) × 6/12 = 62,00 €", () => {
    const r = vorabpauschale({
      referenceValue: d(10000),
      basiszins: zins2026,
      gain: d(1500),
      distributions: d(100),
      teilfreistellung: equity,
      monthsBeforeAcquisition: 6,
    });
    expect(r.vorabpauschale.toFixed(2)).toBe("62.00");
  });

  test.todo("Fall D: Bezugsgröße (Anschaffungspreis oder Jahresanfangswert) und Kürzungsregel gegen BMF-/Finanztip-Beispiel prüfen");

  test("Ausschüttungen mindern den Basisertrag, nie unter 0", () => {
    const partly = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(1500), distributions: d(100), teilfreistellung: equity });
    expect(partly.vorabpauschale.toFixed(2)).toBe("124.00");
    const fully = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(1500), distributions: d(300), teilfreistellung: equity });
    expect(fully.vorabpauschale.toFixed(2)).toBe("0.00");
  });

  test("Teilfreistellung Mischfonds 15 % und Immobilienfonds 60 %", () => {
    const mixed = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(1500), teilfreistellung: TEILFREISTELLUNG.mixed });
    expect(mixed.taxable.toFixed(2)).toBe("190.40");
    expect(mixed.tax.toFixed(2)).toBe("50.22");
    const realEstate = vorabpauschale({ referenceValue: d(10000), basiszins: zins2026, gain: d(1500), teilfreistellung: TEILFREISTELLUNG.realEstate });
    expect(realEstate.taxable.toFixed(2)).toBe("89.60");
    expect(realEstate.tax.toFixed(2)).toBe("23.63");
  });

  test("Basiszins 2025 (2,53 %): Basisertrag 177,10 € bei 10.000 €", () => {
    const r = vorabpauschale({ referenceValue: d(10000), basiszins: d("0.0253"), gain: d(1500), teilfreistellung: equity });
    expect(r.basisertrag.toFixed(2)).toBe("177.10");
    expect(r.tax.toFixed(2)).toBe("32.70");
  });

  test("ungültige Monatsangabe wird abgewiesen", () => {
    expect(() =>
      vorabpauschale({ referenceValue: d(1), basiszins: zins2026, gain: d(1), teilfreistellung: equity, monthsBeforeAcquisition: 12 }),
    ).toThrow(RangeError);
  });
});
