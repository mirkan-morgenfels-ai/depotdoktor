import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type AssetClass, type Transaction } from "@portfolio/csv";
import { EMPTY_TAX_INPUTS, taxInputsReducer, type TaxInputAction, type TaxInputs } from "../tax/inputs";
import { buildTaxPositions } from "../tax/positions";
import {
  buildTaxSummary,
  defaultFundType,
  distributionText,
  FUND_TYPE_MISSING_LABEL,
  MISSING_PRICES_LABEL,
  TAX_METHOD_NOTES,
  taxStatusHint,
} from "../tax/summary";
import { FUND_TYPE_LABELS } from "../tax/constants";
import { buildReport } from "../report";
import { buildReportPdfData } from "../pdf-data";

const FUND_TYPE_MISSING_PDF =
  "Keine Schätzung: Fondstyp nicht gewählt. Der Export nennt keine Assetklasse, aus der sich der Fondstyp ergibt; bitte im Steuerreiter den Fondstyp wählen.";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id" | "date" | "type" | "amount">): Transaction {
  return {
    broker: "scalable",
    rowIndex: 0,
    datetime: null,
    isin: "IE00TEST0001",
    name: "Testfonds Welt UCITS ETF",
    symbol: null,
    assetClass: "unknown",
    shares: null,
    price: null,
    fee: "0",
    tax: "0",
    currency: "EUR",
    rawType: partial.type,
    ...partial,
  };
}

const KEY = "IE00TEST0001";
const buy2025 = tx({ id: "buy-2025", date: "2025-03-03", type: "buy", amount: "-1000", shares: "10", price: "100" });
const buy2026 = tx({ id: "buy-2026", date: "2026-01-15", type: "buy", amount: "-550", shares: "5", price: "110" });
const twoYears = [buy2025, buy2026];
const meta = { fileName: "scalable.csv", broker: "scalable" as const, transactionCount: 2, generatedAt: new Date(2026, 9, 8, 12) };

function apply(...actions: TaxInputAction[]): TaxInputs {
  return actions.reduce(taxInputsReducer, EMPTY_TAX_INPUTS);
}

const chooseEquity: TaxInputAction = { type: "setFundType", positionKey: KEY, fundType: "equity" };
const chooseNone: TaxInputAction = { type: "setFundType", positionKey: KEY, fundType: "none" };

describe("Positionen ohne Assetklasse: kein vorbelegter Fondstyp", () => {
  test("Standard nach Assetklasse: ohne Assetklasse keiner, ETF und Fonds Aktienfonds, Aktie, Anleihe und Krypto kein Fonds", () => {
    const classes: AssetClass[] = ["unknown", "etf", "fund", "stock", "bond", "crypto"];
    const transactions = classes.map((assetClass, index) =>
      tx({ id: `buy-${assetClass}`, date: "2026-02-02", type: "buy", amount: "-100", shares: "1", price: "100", isin: `XX000000000${index}`, name: `Position ${index}`, assetClass }),
    );
    const positions = buildTaxPositions(transactions, 2026);
    expect(positions.map((p) => `${p.assetClass}: ${defaultFundType(p)}`)).toEqual([
      "unknown: null",
      "etf: equity",
      "fund: equity",
      "stock: none",
      "bond: none",
      "crypto: none",
    ]);
  });

  test("ohne Wahl keine Schätzung, auch mit vollständigen Kursen: Status 'fundTypeMissing', Hinweis 'Fondstyp wählen', vorbelegte Kurse bleiben sichtbar", () => {
    for (const inputs of [EMPTY_TAX_INPUTS, apply({ type: "setPrice", year: 2026, positionKey: KEY, field: "yearStartPrice", value: "105,00" }, { type: "setPrice", year: 2026, positionKey: KEY, field: "yearEndPrice", value: "125,00" })]) {
      const summary = buildTaxSummary(twoYears, 2026, inputs);
      const row = summary.rows[0]!;
      expect(row.settings.fundType).toBeNull();
      expect(row.estimate).toBeNull();
      expect(row.status).toBe("fundTypeMissing");
      expect(summary.totals.status).toBe("missing");
      expect(summary.totals.missingFundType).toBe(true);
      expect(summary.totals.missingPrices).toBe(false);
      expect(taxStatusHint(summary.totals)).toBe(FUND_TYPE_MISSING_LABEL);
    }
    expect(buildTaxSummary(twoYears, 2026).rows[0]!.settings).toEqual({ fundType: null, yearStartPrice: "100,00", yearEndPrice: "110,00" });
  });

  test("nach der Wahl 'Aktienfonds' dieselbe Rechnung wie für einen ETF: vorläufig 15 × 100 × 3,2 % × 0,7 = 33,60 €; × 0,7 = 23,52 €", () => {
    const summary = buildTaxSummary(twoYears, 2026, apply(chooseEquity));
    expect(summary.rows[0]?.status).toBe("provisional");
    expect(summary.totals.missingFundType).toBe(false);
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("33.60");
    expect(summary.totals.taxable.toFixed(2)).toBe("23.52");
    expect(taxStatusHint(summary.totals)).toBe("vorläufig (Kurs aus dem Export)");
  });

  test("nach der Wahl 'Kein Fonds (Aktie, Anleihe, Derivat)' keine Vorabpauschale und keine Kurse nötig: 0,00 €, vollständig", () => {
    const summary = buildTaxSummary(twoYears, 2025, apply(chooseNone));
    expect(summary.rows[0]?.status).toBe("notApplicable");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(taxStatusHint(summary.totals)).toBeNull();
  });

  test("ohne Bestand am 31.12. ist keine Wahl nötig: Kauf 10 @ 100 am 10.02.2026, Verkauf 10 @ 110 am 20.05.2026 ergibt 0,00 € und Gewinn 10 × (110 − 100) = 100,00 €", () => {
    const transactions = [
      tx({ id: "buy-feb", date: "2026-02-10", type: "buy", amount: "-1000", shares: "10", price: "100" }),
      tx({ id: "sell-may", date: "2026-05-20", type: "sell", amount: "1100", shares: "10", price: "110" }),
    ];
    const summary = buildTaxSummary(transactions, 2026);
    expect(summary.rows[0]?.settings.fundType).toBeNull();
    expect(summary.rows[0]?.status).toBe("notApplicable");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(summary.totals.realizedGain.toFixed(2)).toBe("100.00");
  });

  test("eine Position ohne Fondstyp und ein ETF ohne Kurs 01.01.: Hinweis 'Fondstyp wählen · Kurse eintragen'", () => {
    const etf = tx({ id: "etf-2026", date: "2026-03-02", type: "buy", amount: "-500", shares: "5", price: "100", isin: "IE00TEST0009", name: "Zweit-ETF", assetClass: "etf" });
    const summary = buildTaxSummary([...twoYears, etf], 2026);
    expect(summary.rows.map((r) => `${r.position.name}: ${r.status}`)).toEqual(["Testfonds Welt UCITS ETF: fundTypeMissing", "Zweit-ETF: missing"]);
    expect(summary.totals.missingFundType).toBe(true);
    expect(summary.totals.missingPrices).toBe(true);
    expect(taxStatusHint(summary.totals)).toBe(`${FUND_TYPE_MISSING_LABEL} · ${MISSING_PRICES_LABEL}`);
  });

  test("angesetzte Vorabpauschalen erst nach der Fondstypwahl: ohne Wahl kein Feld und 10 × (120 − 100) = 200,00 €, mit Aktienfonds 200,00 − 25,30 = 174,70 €", () => {
    const sale = tx({ id: "sell-2026", date: "2026-05-04", type: "sell", amount: "1200", shares: "10", price: "120" });
    const credits = { "sell-2026": "25,30" };
    const without = buildTaxSummary([buy2025, sale], 2026, EMPTY_TAX_INPUTS, credits).rows[0]!.sales[0]!;
    expect(without.creditAllowed).toBe(false);
    expect(without.gain.toFixed(2)).toBe("200.00");
    const withEquity = buildTaxSummary([buy2025, sale], 2026, apply(chooseEquity), credits).rows[0]!.sales[0]!;
    expect(withEquity.creditAllowed).toBe(true);
    expect(withEquity.gain.toFixed(2)).toBe("174.70");
  });

  test("Hinweis am Verkauf von Vorjahresanteilen ohne Fondstyp ('creditNeedsFundType'), nach 'Aktienfonds' oder 'Kein Fonds' nicht mehr, bei Verkauf nur von Anteilen des Jahres nie", () => {
    const sale = tx({ id: "sell-2026", date: "2026-05-04", type: "sell", amount: "1200", shares: "10", price: "120" });
    const flags = (transactions: Transaction[], inputs: TaxInputs) => {
      const row = buildTaxSummary(transactions, 2026, inputs).rows[0]!;
      return { status: row.status, sales: row.sales.map((s) => `${s.creditNeedsFundType} ${s.creditAllowed}`) };
    };
    expect(flags([buy2025, sale], EMPTY_TAX_INPUTS)).toEqual({ status: "notApplicable", sales: ["true false"] });
    expect(flags([buy2025, sale], apply(chooseEquity))).toEqual({ status: "notApplicable", sales: ["false true"] });
    expect(flags([buy2025, sale], apply(chooseNone))).toEqual({ status: "notApplicable", sales: ["false false"] });
    const buyFeb = tx({ id: "buy-feb", date: "2026-02-10", type: "buy", amount: "-1000", shares: "10", price: "100" });
    expect(flags([buyFeb, sale], EMPTY_TAX_INPUTS)).toEqual({ status: "notApplicable", sales: ["false false"] });
  });

  test("Ausschüttung ohne Fondstyp: 'Ausschüttungen bzw. Dividenden 2026 (brutto, vor Steuerabzug): 100,00 €' ohne Zusatz zum Basisertrag", () => {
    const distribution = tx({ id: "dist", date: "2026-03-10", type: "dividend", amount: "100", shares: "10" });
    const [position] = buildTaxPositions([buy2025, distribution], 2026);
    expect(distributionText(position!, null, 2026)).toBe("Ausschüttungen bzw. Dividenden 2026 (brutto, vor Steuerabzug): 100,00 €");
  });

  test("Scalable-Testdatei: beide Positionen ohne Fondstyp und mit Bestand am 31.12.2026, also beide 'fundTypeMissing'", () => {
    const path = fileURLToPath(new URL("../../../../../packages/csv/fixtures/scalable-synthetic.csv", import.meta.url));
    const parsed = parseBrokerCsv(readFileSync(path, "utf8"));
    if (!parsed.ok) throw new Error(parsed.error);
    const summary = buildTaxSummary(parsed.transactions, 2026);
    expect(summary.rows.map((r) => `${r.position.name}: ${r.settings.fundType} ${r.status}`)).toEqual([
      "Musterwerk AG: null fundTypeMissing",
      "Testfonds Welt UCITS ETF: null fundTypeMissing",
    ]);
    expect(taxStatusHint(summary.totals)).toBe(FUND_TYPE_MISSING_LABEL);
  });

  test("PDF ohne Fondstyp: Kacheln '–' mit 'Fondstyp wählen', Hinweis statt Tabelle, Fußnote 'Fondstyp nicht gewählt', kein 0,00 €", () => {
    const data = buildReportPdfData(buildReport(twoYears), buildTaxSummary(twoYears, 2026), meta);
    for (const metric of data.taxSummary.slice(0, 3)) {
      expect(metric.value).toBe("–");
      expect(metric.hint).toContain("Fondstyp wählen");
    }
    expect(JSON.stringify(data.taxSummary.slice(0, 3))).not.toContain("0,00");
    expect(data.taxTables[0]?.columns).toEqual(["Hinweis"]);
    expect(data.taxTables[0]?.rows.map((r) => r.cells)).toEqual([
      [FUND_TYPE_MISSING_PDF],
    ]);
    expect(data.taxTables[0]?.footnote).toContain("Fondstyp nicht gewählt · Kurs 01.01.2026: 100,00 € (vorläufig, Kurs aus dem Export)");
  });

  test("PDF nach der Wahl 'Aktienfonds': vorläufig 33,60 €", () => {
    const data = buildReportPdfData(buildReport(twoYears), buildTaxSummary(twoYears, 2026, apply(chooseEquity)), meta);
    expect(data.taxSummary[0]?.value).toBe("33,60 €");
    expect(data.taxTables[0]?.footnote).toContain("Aktienfonds (Teilfreistellung 30 %)");
  });
});

describe("Derivate sind kein Investmentfonds, Cash ohne Vorbelegung", () => {
  const DERIVATIVE_ISIN = "DE000TEST0D1";
  const derivativeBuy = tx({ id: "der-buy", date: "2025-05-02", type: "buy", amount: "-60", shares: "20", price: "3", isin: DERIVATIVE_ISIN, name: "Long Testindex", assetClass: "derivative" });
  const derivativeSale = tx({ id: "der-sell", date: "2026-06-01", type: "sell", amount: "40", shares: "10", price: "4", isin: DERIVATIVE_ISIN, name: "Long Testindex", assetClass: "derivative" });
  const derivative = [derivativeBuy, derivativeSale];
  const cash = twoYears.map((t) => ({ ...t, assetClass: "cash" as const }));

  test("Standard nach Assetklasse: Derivat 'Kein Fonds' (§ 1 Abs. 2 InvStG, BMF Rz. 1.4: Zertifikate sind kein Investmentvermögen), Cash keiner", () => {
    const classes: AssetClass[] = ["derivative", "cash"];
    const transactions = classes.map((assetClass, index) =>
      tx({ id: `buy-${assetClass}`, date: "2026-02-02", type: "buy", amount: "-100", shares: "1", price: "100", isin: `XX000000001${index}`, name: `Position ${index}`, assetClass }),
    );
    expect(buildTaxPositions(transactions, 2026).map((p) => `${p.assetClass}: ${defaultFundType(p)}`)).toEqual(["derivative: none", "cash: null"]);
  });

  test("Derivat mit Bestand am 31.12.2026 ohne Wahl: 0,00 € statt vorläufig 10 × 3,00 × 3,2 % × 0,7 = 0,67 €, vollständig, kein Feld für angesetzte Vorabpauschalen, Gewinn 10 × (4,00 − 3,00) = 10,00 €", () => {
    const summary = buildTaxSummary(derivative, 2026, EMPTY_TAX_INPUTS, { "der-sell": "5,00" });
    const row = summary.rows[0]!;
    expect(row.settings.fundType).toBe("none");
    expect(row.heldAtYearEnd).toBe(true);
    expect(row.status).toBe("notApplicable");
    expect(summary.totals.status).toBe("complete");
    expect(summary.totals.vorabpauschale.toFixed(2)).toBe("0.00");
    expect(summary.totals.tax.toFixed(2)).toBe("0.00");
    expect(taxStatusHint(summary.totals)).toBeNull();
    expect(row.sales.map((s) => `${s.creditAllowed} ${s.creditNeedsFundType} ${s.gain.toFixed(2)}`)).toEqual(["false false 10.00"]);
  });

  test("Trade-Republic-Export: Assetklasse DERIVATIVE und WARRANT 'Kein Fonds', FUND weiter Aktienfonds", () => {
    const csv = [
      '"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","isin"',
      '"2025-05-02T09:00:00.000Z","2025-05-02","DEFAULT","TRADING","BUY","DERIVATIVE","Long Testindex","","20.0000000000","3.00","-60.00","0.00","0.00","EUR","DE000TEST0D1"',
      '"2025-05-05T09:00:00.000Z","2025-05-05","DEFAULT","TRADING","BUY","WARRANT","Call Musterwerk","","100.0000000000","0.50","-50.00","0.00","0.00","EUR","DE000TEST0W2"',
      '"2025-05-06T09:00:00.000Z","2025-05-06","DEFAULT","TRADING","BUY","FUND","Testfonds Welt UCITS ETF","","10.0000000000","100.00","-1000.00","0.00","0.00","EUR","IE00TEST0001"',
      "",
    ].join("\n");
    const parsed = parseBrokerCsv(csv);
    if (!parsed.ok) throw new Error(parsed.error);
    const summary = buildTaxSummary(parsed.transactions, 2025);
    expect(summary.rows.map((r) => `${r.position.name}: ${r.position.assetClass} ${r.settings.fundType} ${r.status}`)).toEqual([
      "Call Musterwerk: derivative none notApplicable",
      "Long Testindex: derivative none notApplicable",
      "Testfonds Welt UCITS ETF: fund equity missing",
    ]);
  });

  test("Cash ohne Vorbelegung: 'fundTypeMissing'; nach 'Sonstiger Fonds' vorläufig 15 × 100 × 3,2 % × 0,7 = 33,60 €, steuerpflichtig 33,60 € ohne Teilfreistellung, Steuer 33,60 × 26,375 % = 8,86 €; nach 'Kein Fonds' 0,00 €", () => {
    const without = buildTaxSummary(cash, 2026);
    expect(without.rows[0]?.settings.fundType).toBeNull();
    expect(without.rows[0]?.status).toBe("fundTypeMissing");
    expect(taxStatusHint(without.totals)).toBe(FUND_TYPE_MISSING_LABEL);

    const other = buildTaxSummary(cash, 2026, apply({ type: "setFundType", positionKey: KEY, fundType: "other" }));
    expect(other.rows[0]?.status).toBe("provisional");
    expect(other.totals.vorabpauschale.toFixed(2)).toBe("33.60");
    expect(other.totals.taxable.toFixed(2)).toBe("33.60");
    expect(other.totals.tax.toFixed(2)).toBe("8.86");

    const none = buildTaxSummary(cash, 2026, apply(chooseNone));
    expect(none.rows[0]?.status).toBe("notApplicable");
    expect(none.totals.vorabpauschale.toFixed(2)).toBe("0.00");
  });

  test("PDF wie Ansicht: Derivat mit 0,00 € und 'Kein Fonds (Aktie, Anleihe, Derivat)', Cash mit '–' und 'Fondstyp wählen', Methodenhinweis 04 nennt beides", () => {
    expect(FUND_TYPE_LABELS.none).toBe("Kein Fonds (Aktie, Anleihe, Derivat)");
    const data = buildReportPdfData(buildReport(derivative), buildTaxSummary(derivative, 2026), meta);
    for (const metric of data.taxSummary.slice(0, 3)) {
      expect(metric.value).toMatch(/^0,00\s€$/);
      expect(metric.hint).not.toContain("Fondstyp wählen");
    }
    expect(data.taxTables[0]?.columns).toEqual(["Hinweis"]);
    expect(data.taxTables[0]?.rows.map((r) => r.cells)).toEqual([["Keine Vorabpauschale: kein Fonds (z. B. Einzelaktie, Anleihe oder Derivat)."]]);
    expect(data.taxTables[0]?.footnote).toMatch(/^Kein Fonds \(Aktie, Anleihe, Derivat\) · Verkauf 01\.06\.2026, 10 Stück: .*Gewinn 10,00\s€ \(FIFO\)$/);

    const cashData = buildReportPdfData(buildReport(cash), buildTaxSummary(cash, 2026), meta);
    expect(cashData.taxSummary[0]?.value).toBe("–");
    expect(cashData.taxSummary[0]?.hint).toContain("Fondstyp wählen");
    expect(cashData.taxTables[0]?.rows.map((r) => r.cells)).toEqual([[FUND_TYPE_MISSING_PDF]]);

    expect(TAX_METHOD_NOTES[3]).toContain("Aktie, Anleihe, Krypto und Derivat (Zertifikat, Optionsschein, Hebelprodukt) als kein Fonds");
    expect(TAX_METHOD_NOTES[3]).toContain("bei der Assetklasse „Cash“");
    expect(data.taxMethod[3]).toBe(TAX_METHOD_NOTES[3]);
  });
});
