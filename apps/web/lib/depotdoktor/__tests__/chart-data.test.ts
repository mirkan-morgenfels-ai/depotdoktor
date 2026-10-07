import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseBrokerCsv } from "@portfolio/csv";
import { buildPortfolio } from "../portfolio";
import { valueChartPoints } from "../chart-data";

const path = fileURLToPath(new URL("../../../../../packages/csv/fixtures/traderepublic-synthetic.csv", import.meta.url));
const parsed = parseBrokerCsv(readFileSync(path, "utf8"));

describe("Datenaufbereitung für den Wertverlauf", () => {
  test("Punkte tragen Zeitstempel in Millisekunden (UTC) und beginnen am ersten Kauf, nicht am Einzahlungstag", () => {
    if (!parsed.ok) throw new Error(parsed.error);
    const points = valueChartPoints(buildPortfolio(parsed.transactions));
    expect(points[0]).toEqual({ time: Date.UTC(2026, 0, 6), date: "2026-01-06", label: "06.01.2026", value: 8000, flow: 8001 });
    expect(points.map((p) => p.date)).toEqual(["2026-01-06", "2026-02-10", "2026-03-15", "2026-06-20"]);
  });

  test("Abstände sind zeitproportional: 35 Tage zwischen erstem und zweitem Kauf", () => {
    if (!parsed.ok) throw new Error(parsed.error);
    const points = valueChartPoints(buildPortfolio(parsed.transactions));
    expect((points[1]!.time - points[0]!.time) / 86_400_000).toBe(35);
    expect((points[3]!.time - points[2]!.time) / 86_400_000).toBe(97);
  });
});
