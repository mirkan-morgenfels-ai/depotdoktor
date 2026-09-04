import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { detectBroker, parseBrokerCsv, EMPTY_FILE_MESSAGE } from "../index";

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url)), "utf8");
}

describe("detectBroker", () => {
  test("erkennt Trade Republic an der Kopfzeile", () => {
    expect(detectBroker(fixture("traderepublic-synthetic.csv"))?.broker).toBe("traderepublic");
  });

  test("erkennt Scalable Capital an der Kopfzeile", () => {
    expect(detectBroker(fixture("scalable-synthetic.csv"))?.broker).toBe("scalable");
  });

  test("erkennt BOM-Datei", () => {
    expect(detectBroker(`\uFEFF${fixture("scalable-synthetic.csv")}`)?.broker).toBe("scalable");
  });

  test("unbekanntes Format ergibt null", () => {
    expect(detectBroker(fixture("unknown-format.csv"))).toBeNull();
  });
});

describe("parseBrokerCsv Trade Republic", () => {
  const result = parseBrokerCsv(fixture("traderepublic-synthetic.csv"));

  test("liefert alle Zeilen als Transaktionen, chronologisch sortiert", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.broker).toBe("traderepublic");
    expect(result.transactions).toHaveLength(8);
    expect(result.transactions.map((t) => t.date)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-02-10",
      "2026-03-15",
      "2026-04-01",
      "2026-06-20",
      "2026-07-19",
      "2026-08-02",
    ]);
  });

  test("Sparplan-Kauf: Stückzahl, Preis, Betrag, Gebühr, ISIN", () => {
    if (!result.ok) throw new Error("parse failed");
    const buy = result.transactions[1]!;
    expect(buy.type).toBe("buy");
    expect(buy.assetClass).toBe("etf");
    expect(buy.isin).toBe("IE00TEST0001");
    expect(buy.shares).toBe("100");
    expect(buy.price).toBe("80");
    expect(buy.amount).toBe("-8001");
    expect(buy.fee).toBe("1");
    expect(buy.currency).toBe("EUR");
  });

  test("Dividende mit Steuerabzug", () => {
    if (!result.ok) throw new Error("parse failed");
    const dividend = result.transactions[3]!;
    expect(dividend.type).toBe("dividend");
    expect(dividend.amount).toBe("18.5");
    expect(dividend.tax).toBe("6.5");
  });

  test("Verkauf ist Geldzufluss", () => {
    if (!result.ok) throw new Error("parse failed");
    const sell = result.transactions[5]!;
    expect(sell.type).toBe("sell");
    expect(sell.shares).toBe("4");
    expect(sell.amount).toBe("479");
  });

  test("Einzahlung, Zinsen und Kartenzahlung werden typisiert", () => {
    if (!result.ok) throw new Error("parse failed");
    expect(result.transactions[0]!.type).toBe("deposit");
    expect(result.transactions[4]!.type).toBe("interest");
    expect(result.transactions[7]!.type).toBe("withdrawal");
    expect(result.transactions[7]!.amount).toBe("-42.17");
  });

  test("Krypto-Erhalt ohne Betrag wird als unbekannt markiert und gemeldet", () => {
    if (!result.ok) throw new Error("parse failed");
    const receipt = result.transactions[6]!;
    expect(receipt.type).toBe("other");
    expect(receipt.assetClass).toBe("crypto");
    expect(result.warnings.some((w) => w.rowIndex === receipt.rowIndex)).toBe(true);
  });
});

describe("parseBrokerCsv Scalable Capital", () => {
  const result = parseBrokerCsv(fixture("scalable-synthetic.csv"));

  test("überspringt nicht ausgeführte Zeilen", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(6);
    expect(result.skippedRows).toBe(1);
    expect(result.warnings.some((w) => w.message.includes("PENDING"))).toBe(true);
  });

  test("Kauf mit Dezimalkomma", () => {
    if (!result.ok) throw new Error("parse failed");
    const buy = result.transactions[1]!;
    expect(buy.type).toBe("buy");
    expect(buy.isin).toBe("IE00TEST0001");
    expect(buy.shares).toBe("100");
    expect(buy.price).toBe("80");
    expect(buy.amount).toBe("-8000.99");
    expect(buy.fee).toBe("0.99");
    expect(buy.datetime).toBe("2026-01-06T08:00:00");
  });

  test("Ausschüttung wird als Dividende geführt", () => {
    if (!result.ok) throw new Error("parse failed");
    const distribution = result.transactions[3]!;
    expect(distribution.type).toBe("dividend");
    expect(distribution.amount).toBe("18.5");
    expect(distribution.tax).toBe("6.5");
  });

  test("Verkauf", () => {
    if (!result.ok) throw new Error("parse failed");
    const sell = result.transactions[4]!;
    expect(sell.type).toBe("sell");
    expect(sell.amount).toBe("479.01");
  });

  test("Einzahlung und Zinsen", () => {
    if (!result.ok) throw new Error("parse failed");
    expect(result.transactions[0]!.type).toBe("deposit");
    expect(result.transactions[0]!.amount).toBe("10000");
    expect(result.transactions[5]!.type).toBe("interest");
  });
});

describe("parseBrokerCsv Fehlerfälle", () => {
  test("leere Datei", () => {
    const result = parseBrokerCsv("");
    expect(result).toEqual({ ok: false, error: EMPTY_FILE_MESSAGE });
  });

  test("unbekanntes Format bricht mit klarer Meldung ab", () => {
    const result = parseBrokerCsv(fixture("unknown-format.csv"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("nicht erkannt");
    expect(result.error).toContain("Buchungstag");
    expect(result.error).toContain("Trade Republic");
  });

  test("nur Kopfzeile ergibt leere Transaktionsliste", () => {
    const header = fixture("scalable-synthetic.csv").split("\n")[0]!;
    const result = parseBrokerCsv(`${header}\n`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(0);
  });

  test("unlesbares Datum wird gemeldet und Zeile übersprungen", () => {
    const header = fixture("scalable-synthetic.csv").split("\n")[0]!;
    const row = "gestern;09:00:00;Executed;X;Y;Security;Buy;IE00TEST0001;1;10,00;-10,00;0,00;0,00;EUR";
    const result = parseBrokerCsv(`${header}\n${row}\n`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows).toBe(1);
    expect(result.warnings[0]?.message).toContain("Datum");
  });
});
