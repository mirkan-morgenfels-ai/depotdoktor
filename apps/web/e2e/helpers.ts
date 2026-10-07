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
