import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv, type Transaction } from "@portfolio/csv";
import { buildReport } from "../report";
import { amountKpis, PERFORMANCE_EXPLANATION, performanceKpis } from "../kpis";

function fixtureTransactions(name: string): Transaction[] {
  const path = fileURLToPath(new URL(`../../../../../packages/csv/fixtures/${name}`, import.meta.url));
  const result = parseBrokerCsv(readFileSync(path, "utf8"));
  if (!result.ok) throw new Error(result.error);
  return result.transactions;
}

function buy(id: string, date: string, shares: string, price: string, amount: string): Transaction {
  return {
    id,
    broker: "scalable",
    rowIndex: 0,
    date,
    datetime: null,
    type: "buy",
    isin: "IE00TEST0001",
    name: "ETF",
    symbol: null,
    assetClass: "etf",
    shares,
    price,
    amount,
    fee: "0",
    tax: "0",
    currency: "EUR",
    rawType: "Buy",
  };
}

describe("Kennzahl-Kacheln", () => {
  test("unter einem Jahr: TTWROR kumuliert, nicht annualisiert; IRR geldgewichtet p. a. mit Bewertungsstand", () => {
    const [ttwror, irr] = performanceKpis(buildReport(fixtureTransactions("traderepublic-synthetic.csv")));
    expect(ttwror).toMatchObject({ label: "TTWROR (kumuliert)", value: "+2,40\u00A0%" });
    expect(ttwror?.hint).toBe("nicht annualisiert, Zeitraum unter 1 Jahr · 06.01.2026 bis 20.06.2026");
    expect(irr?.label).toBe("IRR (geldgewichtet, p. a.)");
    expect(irr?.value).toBe("+5,51\u00A0%");
    expect(irr?.hint).toBe("bewertet zum letzten Kurs im Export, Stand 20.06.2026");
  });

  test("ab einem Jahr: TTWROR p. a.; Kauf 10 @ 100, ein Jahr später Kauf 1 @ 121: (11 × 121 − 121)/1000 − 1 = 21 % über 365 Tage", () => {
    const report = buildReport([buy("a", "2025-01-02", "10", "100", "-1000"), buy("b", "2026-01-02", "1", "121", "-121")]);
    const [ttwror] = performanceKpis(report);
    expect(ttwror).toMatchObject({ label: "TTWROR (p. a.)", value: "+21,00\u00A0%" });
    expect(ttwror?.hint).toBe("kumuliert +21,00\u00A0% · 02.01.2025 bis 02.01.2026");
  });

  test("Max Drawdown mit Zeitraum: Testdatei 1 − 7999/8001 = 0,025 %, Hoch 06.01., Tief 10.02.", () => {
    const drawdown = performanceKpis(buildReport(fixtureTransactions("traderepublic-synthetic.csv"))).find((k) => k.key === "drawdown");
    expect(drawdown).toMatchObject({ value: "−0,02 %", hint: "06.01.2026 → 10.02.2026" });
  });

  test("Max Drawdown nur am Kauftag: Kauf 100 @ 80 für 8.001 €, danach nur Gewinn; 1 − 8000/8001 = 0,0125 %, Hinweis nennt einen Tag statt 06.01.2026 → 06.01.2026", () => {
    const sell: Transaction = { ...buy("b", "2026-06-20", "50", "84", "4199"), type: "sell", fee: "1", rawType: "Sell" };
    const report = buildReport([{ ...buy("a", "2026-01-06", "100", "80", "-8001"), fee: "1" }, sell]);
    expect(report.drawdown.peakDate).toBe("2026-01-06");
    expect(report.drawdown.troughDate).toBe("2026-01-06");
    expect(report.drawdown.maxDrawdown.toFixed(6)).toBe("0.000125");
    const drawdown = performanceKpis(report).find((k) => k.key === "drawdown");
    expect(drawdown).toMatchObject({ value: "−0,01 %", hint: "am 06.01.2026 (Kauftag)" });
  });

  test("Erklärsatz und acht Betragskacheln", () => {
    expect(PERFORMANCE_EXPLANATION).toBe(
      "Die TTWROR misst die Wertentwicklung unabhängig davon, wann Sie Geld investiert haben; der IRR berücksichtigt Zeitpunkt und Höhe Ihrer Käufe und Verkäufe. Der IRR p. a. hängt vom Endzeitpunkt ab.",
    );
    const amounts = amountKpis(buildReport(fixtureTransactions("traderepublic-synthetic.csv")));
    expect(amounts.map((k) => `${k.label}: ${k.value}`)).toEqual([
      "Depotwert (letzter Kurs): 8.720,00\u00A0€",
      "Investiert (Käufe): 9.002,00\u00A0€",
      "Verkaufserlöse: 479,00\u00A0€",
      "Dividenden netto: 18,50\u00A0€",
      "Gebühren: 3,00\u00A0€",
      "Abgeführte Steuern: 6,50\u00A0€",
      "Einzahlungen Konto: 10.000,00\u00A0€",
      "Zinsen Konto: 3,21\u00A0€",
    ]);
  });
});
