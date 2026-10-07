import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv } from "@portfolio/csv";
import { SAMPLE_CSV_TRADEREPUBLIC, SAMPLE_FILE_NAME, SAMPLE_ROW_COUNT } from "../sample";
import { buildReport } from "../report";
import { buildTaxSummary } from "../tax/summary";

const fixture = readFileSync(
  fileURLToPath(new URL("../../../../../packages/csv/fixtures/traderepublic-synthetic.csv", import.meta.url)),
  "utf8",
);

describe("Beispieldatei", () => {
  test("ist byte-gleich mit der synthetischen Trade-Republic-Fixture", () => {
    expect(SAMPLE_CSV_TRADEREPUBLIC).toBe(fixture);
    expect(SAMPLE_FILE_NAME).toBe("beispiel-traderepublic.csv");
  });

  test("hat 8 Datenzeilen, liest 8 Buchungen ohne übersprungene Zeile; die Ethereum-Einbuchung bleibt „Sonstiges“ mit Hinweis", () => {
    expect(SAMPLE_ROW_COUNT).toBe(8);
    const parsed = parseBrokerCsv(SAMPLE_CSV_TRADEREPUBLIC);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.broker).toBe("traderepublic");
    expect(parsed.transactions).toHaveLength(SAMPLE_ROW_COUNT);
    expect(parsed.skippedRows).toBe(0);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.transactions.filter((t) => t.type === "other").map((t) => t.name)).toEqual(["Ethereum"]);
  });

  test("Musterwerk AG ist eine Aktie und damit „Kein Fonds“; die Allokation kennt die Assetklassen", () => {
    const parsed = parseBrokerCsv(SAMPLE_CSV_TRADEREPUBLIC);
    if (!parsed.ok) throw new Error(parsed.error);
    const rows = buildTaxSummary(parsed.transactions, 2026).rows;
    expect(rows.map((r) => `${r.position.name}: ${r.settings.fundType}`)).toEqual([
      "Musterwerk AG: none",
      "Testfonds Welt UCITS ETF: equity",
    ]);
    expect(buildReport(parsed.transactions).allocation.byAssetClass.map((s) => s.label)).toEqual(["ETF", "Aktien"]);
  });
});
