import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

interface AxeViolation {
  id: string;
  nodes: Array<{ target: unknown[] }>;
}

interface AxeWindow {
  axe: {
    run: (context: Document, options: { runOnly: { type: "tag"; values: string[] } }) => Promise<{ violations: AxeViolation[] }>;
  };
}

const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
export const AXE_WIDTHS = [390, 768, 1280];

export const PRIOR_YEAR_SALE_FILE = {
  name: "verkauf-vorjahr.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(
    [
      "date;time;status;reference;description;assetType;type;isin;shares;price;amount;fee;tax;currency",
      '2025-03-03;09:00:00;Executed;"E2E0001";"Testfonds Welt UCITS ETF";Security;Buy;IE00TEST0001;10;100,00;-1000,00;0,00;0,00;EUR',
      '2026-05-04;09:00:00;Executed;"E2E0002";"Testfonds Welt UCITS ETF";Security;Sell;IE00TEST0001;10;120,00;1200,00;0,00;0,00;EUR',
      "",
    ].join("\n"),
    "utf8",
  ),
};

export const SALE_CREDIT_FUND_TYPE_HINT =
  "Für Fondsanteile: Wählen Sie oben den Fondstyp, um die in Vorjahren angesetzten Vorabpauschalen einzutragen. Sie mindern den Gewinn (§ 19 Abs. 1 Satz 3 InvStG); bis dahin wird nichts abgezogen. Zum Fondstyp";

export function originOf(baseURL: string | undefined): string {
  return new URL(baseURL ?? "http://localhost:3000").origin;
}

export async function axeViolations(page: Page): Promise<string[]> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => !(animation instanceof CSSTransition) || animation.playState !== "running"),
  );
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async (tags) => {
    const result = await (window as unknown as AxeWindow).axe.run(document, { runOnly: { type: "tag", values: tags } });
    return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
  }, AXE_TAGS);
}

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message} (${page.url()})`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()} (${page.url()})`);
  });
  return errors;
}
