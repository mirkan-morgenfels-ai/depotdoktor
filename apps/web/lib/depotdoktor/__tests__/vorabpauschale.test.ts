import { describe, expect, test } from "vitest";
import type { Transaction } from "@portfolio/csv";
import { d, Decimal } from "../money";
import { vorabpauschale } from "../tax/vorabpauschale";
import { ABGELTUNGSTEUER_RATE, BASISERTRAG_FACTOR, basiszinsFor, TEILFREISTELLUNG } from "../tax/constants";
import type { TaxInputs } from "../tax/inputs";
import { buildTaxSummary } from "../tax/summary";

const equity = TEILFREISTELLUNG.equity;
const zins2026 = d("0.032");
const FUND_KEY = "IE00TEST0001";

function fundTx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    broker: "traderepublic",
    rowIndex: 0,
    datetime: null,
    isin: FUND_KEY,
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

  test("Fall D gegen BMF Rz. 18.11 im Steuerreiter: Kauf 10 @ 100,30 € am 10.07.2026, Ausschüttung 0,10 € je Anteil im Oktober, Kurse 100,00 € / 100,50 €; Bezugswert ist der Kurs am 01.01.: 10 × 100 × 3,2 % × 0,7 = 22,40 € (nicht 10 × 100,30 × 3,2 % × 0,7 = 22,4672 €), Vorabpauschale (min(22,40; 5,00 + 1,00) − 1,00) × 6/12 = 2,50 €, je Anteil 0,25 € wie im BMF-Beispiel", () => {
    const transactions = [
      fundTx({ id: "buy-july", date: "2026-07-10", type: "buy", amount: "-1003", shares: "10", price: "100.30" }),
      fundTx({ id: "dist-oct", date: "2026-10-15", type: "dividend", amount: "1.00", shares: "10" }),
    ];
    const inputs: TaxInputs = {
      fundTypes: { [FUND_KEY]: "equity" },
      prices: { 2026: { [FUND_KEY]: { yearStartPrice: "100,00", yearEndPrice: "100,50" } } },
    };
    const row = buildTaxSummary(transactions, 2026, inputs).rows[0]!;
    const [part] = row.estimate!.parts;
    expect(row.estimate!.parts).toHaveLength(1);
    expect(part!.monthsBeforeAcquisition).toBe(6);
    expect(part!.result.basisertrag.toFixed(4)).toBe("22.4000");
    expect(part!.result.capApplied).toBe(true);
    expect(part!.result.vorabpauschale.toFixed(2)).toBe("2.50");
    expect(part!.result.vorabpauschale.div(10).toFixed(4)).toBe("0.2500");
    expect(row.estimate!.taxable.toFixed(4)).toBe("1.7500");
    expect(row.estimate!.tax.toFixed(7)).toBe("0.4615625");
  });

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

describe("Abgleich mit den Rechenbeispielen des BMF-Schreibens vom 21.05.2019 (Anwendungsfragen InvStG, BStBl I 2019, 527)", () => {
  const bmfZins = d("0.01");
  const withoutExemption = TEILFREISTELLUNG.other;
  const rz183 = { referenceValue: d(100), basiszins: bmfZins, gain: d("100.50").minus(100), distributions: d("0.10") };

  test("Rz. 18.3: Rücknahmepreis 100 € → 100,50 €, Ausschüttung 0,10 €, Basiszins 1,0 %: Basisertrag 100 × 1,0 % × 0,7 = 0,70 €, Mehrbetrag 0,50 + 0,10 = 0,60 €, Vorabpauschale min(0,70; 0,60) − 0,10 = 0,50 €", () => {
    const r = vorabpauschale({ ...rz183, teilfreistellung: withoutExemption });
    expect(r.basisertrag.toFixed(4)).toBe("0.7000");
    expect(r.capApplied).toBe(true);
    expect(r.vorabpauschale.toFixed(4)).toBe("0.5000");
    expect(Decimal.min(r.basisertrag, rz183.gain.plus(rz183.distributions)).minus(rz183.distributions).toFixed(4)).toBe("0.5000");
  });

  test("Rz. 18.3 mit Teilfreistellung eines Aktienfonds (Handrechnung nach § 20 Abs. 1 InvStG, nicht Teil des BMF-Beispiels): 0,50 × (1 − 30 %) = 0,35 € steuerpflichtig", () => {
    const r = vorabpauschale({ ...rz183, teilfreistellung: equity });
    expect(r.vorabpauschale.toFixed(4)).toBe("0.5000");
    expect(r.taxable.toFixed(4)).toBe("0.3500");
  });

  test("Rz. 18.11: Erwerb am 10.7.01, die Vorabpauschale des ganzen Jahres von 0,50 € mindert sich um 6/12 auf 0,25 €", () => {
    const r = vorabpauschale({ ...rz183, teilfreistellung: withoutExemption, monthsBeforeAcquisition: 6 });
    expect(r.monthsFactor.toFixed(4)).toBe("0.5000");
    expect(r.vorabpauschale.toFixed(4)).toBe("0.2500");
  });

  test("Rz. 18.11 unterscheidet die Kürzungsvarianten nicht in der Zahl: Kürzung des Basisertrags ergibt min(0,70 × 6/12 − 0,10; 0,50) = 0,25 € ebenso", () => {
    const r = vorabpauschale({ ...rz183, teilfreistellung: withoutExemption, monthsBeforeAcquisition: 6, reductionTarget: "basisertrag" });
    expect(r.vorabpauschale.toFixed(4)).toBe("0.2500");
  });

  test("Rz. 18.4: Rechnungszins 0,87 % × 70 % = 0,609 %", () => {
    expect(d("0.0087").times(BASISERTRAG_FACTOR).toFixed(5)).toBe("0.00609");
  });

  test("Rz. 18.4: gerundet wird erst nach der Multiplikation mit der Stückzahl; 1.000 Anteile × 100 € × 0,609 % = 609,00 € (je Anteil 0,6090 €, auf 0,61 € gerundet wären es 610,00 €)", () => {
    const perShare = vorabpauschale({ referenceValue: d(100), basiszins: d("0.0087"), gain: d(10), teilfreistellung: withoutExemption });
    expect(perShare.basisertrag.toFixed(4)).toBe("0.6090");
    const position = vorabpauschale({ referenceValue: d(100).times(1000), basiszins: d("0.0087"), gain: d(10000), teilfreistellung: withoutExemption });
    expect(position.basisertrag.toFixed(2)).toBe("609.00");
    expect(position.basisertrag.toFixed(2)).not.toBe(perShare.basisertrag.toDecimalPlaces(2).times(1000).toFixed(2));
  });
});
