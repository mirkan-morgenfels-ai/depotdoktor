import { expect, test } from "@playwright/test";
import path from "node:path";

const scalableFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/scalable-synthetic.csv");
const tradeRepublicFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/traderepublic-synthetic.csv");
const unknownFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/unknown-format.csv");

test("Beispieldatei: Report mit allen Kennzahlen, kein Upload", async ({ page }) => {
  const outgoing: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://localhost:3000" || request.method() !== "GET") outgoing.push(`${request.method()} ${request.url()}`);
  });

  await page.goto("/projects/depotdoktor");
  await expect(page.getByRole("heading", { name: "DepotDoktor" })).toBeVisible();
  await page.getByRole("button", { name: "Beispieldatei laden" }).click();

  const report = page.getByTestId("report-section");
  await expect(report).toBeVisible();
  await expect(report).toContainText("Scalable Capital");
  await expect(report).toContainText("6 Buchungen");
  await expect(page.getByTestId("performance-tab")).toContainText("+2,41 %");
  await expect(page.getByTestId("performance-tab")).toContainText("8.720,00 €");

  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("Nicht zugeordnet");
  await expect(page.getByTestId("allocation-region")).toContainText("Irland (Fondsdomizil)");

  await page.getByRole("tab", { name: "Steuer" }).click();
  await expect(page.getByTestId("tax-position")).toHaveCount(2);
  await expect(page.getByTestId("tax-tab")).toContainText("FIFO");

  await page.getByRole("tab", { name: "Transaktionen" }).click();
  await expect(page.getByTestId("transactions-tab")).toContainText("Dividende");

  await expect(page.getByText("Keine Anlage- oder Steuerberatung", { exact: false }).first()).toBeVisible();
  expect(outgoing).toEqual([]);
});

test("Trade-Republic-Datei per Upload", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(tradeRepublicFixture);
  await expect(page.getByTestId("report-section")).toContainText("Trade Republic");
  await expect(page.getByTestId("report-section")).toContainText("8 Buchungen");
  await expect(page.getByTestId("performance-tab")).toContainText("+2,41 %");
  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("ETF");
});

test("Scalable-Datei per Upload zeigt übersprungene Zeile", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(scalableFixture);
  await expect(page.getByTestId("report-section")).toContainText("1 übersprungen");
});

test("Unbekanntes Format bricht mit Meldung ab", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(unknownFixture);
  await expect(page.getByTestId("parse-error")).toContainText("nicht erkannt");
  await expect(page.getByTestId("report-section")).toHaveCount(0);
});
