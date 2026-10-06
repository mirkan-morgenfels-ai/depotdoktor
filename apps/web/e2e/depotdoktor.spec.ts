import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
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

  await expect(page.getByTestId("value-chart").locator("svg")).toBeVisible();

  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("Nicht zugeordnet");
  await expect(page.getByTestId("allocation-region")).toContainText("Irland (Fondsdomizil)");
  await expect(page.getByTestId("allocation-asset-class").locator("svg")).toBeVisible();

  await page.getByRole("tab", { name: "Steuer" }).click();
  await expect(page.getByTestId("tax-position")).toHaveCount(2);
  await expect(page.getByTestId("tax-tab")).toContainText("FIFO");

  await page.getByRole("tab", { name: "Transaktionen" }).click();
  await expect(page.getByTestId("transactions-tab")).toContainText("Dividende");

  await expect(page.getByText("Keine Anlage- oder Steuerberatung", { exact: false }).first()).toBeVisible();

  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("export-pdf").click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^depotdoktor-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  const pdfPath = await pdf.path();
  const pdfBytes = readFileSync(pdfPath);
  expect(pdfBytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pdfBytes.byteLength).toBeGreaterThan(5000);

  const csvDownload = page.waitForEvent("download");
  await page.getByTestId("export-csv").click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toMatch(/^depotdoktor-transaktionen-\d{4}-\d{2}-\d{2}\.csv$/);
  const csvText = readFileSync(await csv.path(), "utf8");
  expect(csvText.startsWith("\uFEFFdate;datetime;broker;type;isin")).toBe(true);
  expect(csvText.trim().split("\r\n")).toHaveLength(7);

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

test("PDF-Kontoauszug wird mit klarer Meldung abgelehnt", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles({
    name: "Kontoauszug-Juli.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n", "latin1"),
  });
  const error = page.getByTestId("parse-error");
  await expect(error).toContainText("Kontoauszug-Juli.pdf");
  await expect(error).toContainText("PDF-Datei");
  await expect(error).toContainText("Transaktionsexport");
  await expect(error).not.toContainText("Gefundene Spalten");
  await expect(page.getByTestId("report-section")).toHaveCount(0);
});

test("Excel-Datei wird mit klarer Meldung abgelehnt", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles({
    name: "Depot.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]),
  });
  await expect(page.getByTestId("parse-error")).toContainText("Excel");
  await expect(page.getByTestId("report-section")).toHaveCount(0);
});

test("UTF-16-Export mit BOM wird gelesen", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  const text = readFileSync(tradeRepublicFixture, "utf8");
  await page.getByTestId("file-input").setInputFiles({
    name: "Transaktionen-UTF16.csv",
    mimeType: "text/csv",
    buffer: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]),
  });
  await expect(page.getByTestId("report-section")).toContainText("Trade Republic");
  await expect(page.getByTestId("report-section")).toContainText("8 Buchungen");
  await expect(page.getByTestId("performance-tab")).toContainText("+2,41 %");
});

test("Angesetzte Vorabpauschalen mindern den Veräußerungsgewinn", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles({
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
  });
  await expect(page.getByTestId("report-section")).toContainText("2 Buchungen");
  await page.getByRole("tab", { name: "Steuer" }).click();
  const sale = page.getByTestId("tax-sale");
  const credit = sale.getByTestId("tax-sale-credit");
  const realizedTile = page.getByTestId("tax-realized-gain");
  await expect(sale).toHaveCount(1);
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("200,00 €");
  await expect(realizedTile).toContainText("Realisierte Gewinne 2026 (FIFO)");
  await expect(realizedTile).toContainText("200,00 €");
  await expect(credit).toHaveAccessibleName("Für diese Anteile in Vorjahren angesetzte Vorabpauschalen (€, optional)");
  await expect(credit).toHaveAccessibleDescription(/^Summe der Beträge, die Ihre Bank .* InvStG\.$/);

  await credit.fill("25,30");
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("174,70 €");
  await expect(sale).toContainText("angesetzte Vorabpauschalen 25,30 €");
  await expect(realizedTile).toContainText("174,70 €");
  await expect(page.getByRole("textbox", { name: "Kurs 01.01.2026" })).toHaveValue("120,00");

  await page.getByTestId("tax-year").selectOption("2025");
  await expect(page.getByRole("textbox", { name: "Kurs 01.01.2025" })).toHaveValue("100,00");
  await expect(page.getByRole("textbox", { name: "Kurs 31.12.2025" })).toHaveValue("100,00");
  await expect(page.getByTestId("tax-sale")).toHaveCount(0);

  await page.getByTestId("tax-year").selectOption("2026");
  await expect(credit).toHaveValue("25,30");
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("174,70 €");

  await credit.fill("abc");
  await expect(sale).toContainText("Bitte einen Betrag ab 0");
  await expect(credit).toHaveAttribute("aria-invalid", "true");
  await expect(credit).toHaveAccessibleDescription(/Bitte einen Betrag ab 0 als Dezimalzahl eintragen\. Bis dahin wird nichts abgezogen\.$/);
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("200,00 €");
  await expect(realizedTile).toContainText("200,00 €");
});

test("Startseite und Rechtsseiten: KontoKlar extern verlinkt, NetzRadar in Arbeit, Quellcode nicht als einsehbar bezeichnet", async ({ page }) => {
  await page.goto("/");
  const kontoklar = page.getByTestId("kontoklar-link");
  await expect(kontoklar).toHaveAttribute("href", "https://kontoklar-eight.vercel.app/projects/kontoklar");
  await expect(kontoklar).toHaveAttribute("rel", "noopener noreferrer");
  await expect(kontoklar).toHaveAttribute("target", "_blank");
  await expect(page.locator("main")).toContainText("NetzRadar ist in Arbeit");
  await expect(page.locator("main a")).toHaveCount(2);
  for (const route of ["/", "/impressum", "/datenschutz", "/nutzungsbedingungen"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toContainText("MIT-Lizenz");
    await expect(page.locator("body")).not.toContainText(/quelloffen|GitHub|Quellcode[^.]*zur Verfügung/i);
  }
});

test("Rechtsseiten sind erreichbar und verlinkt", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByRole("link", { name: "Nutzungsbedingungen" }).first().click();
  await expect(page.getByRole("heading", { name: "Nutzungsbedingungen" })).toBeVisible();
  await expect(page.getByText("kein Angebot", { exact: false }).first()).toBeVisible();
  await page.goto("/impressum");
  await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
  await expect(page.getByText("mirkandeniz52@gmail.com").first()).toBeVisible();
  await page.goto("/datenschutz");
  await expect(page.getByRole("heading", { name: "Datenschutzerklärung" })).toBeVisible();
  await expect(page.getByText("Vercel Web Analytics und Speed Insights sind nicht aktiviert")).toBeVisible();
});
