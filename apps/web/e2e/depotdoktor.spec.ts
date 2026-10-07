import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { originOf, watchErrors } from "./helpers";

const scalableFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/scalable-synthetic.csv");
const tradeRepublicFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/traderepublic-synthetic.csv");
const unknownFixture = path.resolve(__dirname, "../../../packages/csv/fixtures/unknown-format.csv");
const tradeRepublicText = readFileSync(tradeRepublicFixture, "utf8");

async function loadSample(page: Page) {
  await page.getByRole("button", { name: "Beispieldatei laden" }).click();
  await expect(page.getByTestId("report-section")).toBeVisible();
}

function taxPosition(page: Page, name: string) {
  return page.getByTestId("tax-position").filter({ has: page.getByRole("heading", { level: 2, name }) });
}

test("Beispieldatei: Report mit allen Kennzahlen, kein Upload", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const origin = originOf(baseURL);
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const target = window as unknown as { cspViolations: string[] };
    target.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      target.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto("/projects/depotdoktor");
  await expect(page.getByRole("heading", { name: "DepotDoktor", level: 1 })).toBeVisible();
  await page.waitForLoadState("load");

  const outgoing: string[] = [];
  const fileMarkers = ["IE00TEST0001", "DE000TEST002", "Musterwerk", "Testfonds"];
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin && url.protocol !== "data:" && url.protocol !== "blob:") {
      outgoing.push(`blockiert: ${request.method()} ${request.url()}`);
    }
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    const body = request.postData() ?? "";
    const sameOriginGet = url.origin === origin && request.method() === "GET";
    const allowedPath = url.pathname.startsWith("/_next/static/") || url.searchParams.has("_rsc");
    if (!sameOriginGet || !allowedPath || fileMarkers.some((marker) => body.includes(marker) || request.url().includes(marker))) {
      outgoing.push(`${request.method()} ${request.url()}`);
    }
  });

  await expect(page.getByTestId("sample-description")).toHaveText("Synthetische Trade-Republic-CSV mit 8 Zeilen; keine echten Daten.");
  await loadSample(page);

  const report = page.getByTestId("report-section");
  await expect(report).toContainText("beispiel-traderepublic.csv · Trade Republic · 8 Buchungen");
  await expect(report).not.toContainText("übersprungen");

  const performance = page.getByTestId("performance-tab");
  await expect(page.getByTestId("kpi-ttwror")).toHaveText(
    /^TTWROR \(kumuliert\)\s*\+2,40\s%\s*nicht annualisiert, Zeitraum unter 1 Jahr · 06\.01\.2026 bis 20\.06\.2026$/,
  );
  await expect(page.getByTestId("kpi-irr")).toHaveText(
    /^IRR \(geldgewichtet, p\. a\.\)\s*\+5,51\s%\s*bewertet zum letzten Kurs im Export, Stand 20\.06\.2026$/,
  );
  await expect(page.getByTestId("kpi-volatility")).toHaveText(/^Volatilität\s*2,32\s% p\. a\./);
  await expect(page.getByTestId("kpi-drawdown")).toHaveText(/^Max Drawdown\s*−0,02\s%\s*06\.01\.2026 → 10\.02\.2026$/);
  await expect(page.getByTestId("performance-explanation")).toHaveText(
    "Die TTWROR misst die Wertentwicklung unabhängig davon, wann Sie Geld investiert haben; der IRR berücksichtigt Zeitpunkt und Höhe Ihrer Käufe und Verkäufe. Der IRR p. a. hängt vom Endzeitpunkt ab.",
  );
  await expect(performance).toContainText("8.720,00 €");
  await expect(performance.getByRole("region", { name: "Tabelle Wertverlauf" }).locator("tbody tr")).toHaveCount(4);

  await expect(page.getByTestId("value-chart").locator("svg").first()).toBeVisible();

  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("ETF");
  await expect(page.getByTestId("allocation-asset-class")).toContainText("Aktien");
  await expect(page.getByTestId("allocation-asset-class")).not.toContainText("Nicht zugeordnet");
  await expect(page.getByTestId("allocation-unassigned-hint")).toHaveCount(0);
  await expect(page.getByTestId("allocation-region")).toContainText("Irland (Fondsdomizil)");
  await expect(page.getByTestId("allocation-asset-class").locator("svg").first()).toBeVisible();

  await page.getByRole("tab", { name: "Steuer" }).click();
  await expect(page.getByTestId("tax-position")).toHaveCount(2);
  await expect(page.getByTestId("tax-tab")).toContainText("FIFO");
  const stock = taxPosition(page, "Musterwerk AG");
  await expect(stock.getByRole("combobox", { name: "Fondstyp" })).toHaveValue("none");
  await expect(stock.getByRole("combobox", { name: "Fondstyp" }).locator("option:checked")).toHaveText("Kein Fonds (Aktie, Anleihe)");
  await expect(stock).toContainText("Kein Fonds: Für diese Position wird keine Vorabpauschale berechnet.");
  await expect(stock.getByTestId("tax-distributions")).toHaveText("Dividenden 2026 (brutto, vor Steuerabzug): 25,00 €.");
  await expect(page.getByTestId("tax-fund-type-hint")).toHaveCount(0);

  await page.getByRole("tab", { name: "Transaktionen" }).click();
  await expect(page.getByTestId("transactions-tab")).toContainText("Dividende");
  await expect(page.getByTestId("transactions-tab").locator("thead th")).toHaveText([
    "Datum",
    "Art",
    "Betrag",
    "Name",
    "ISIN",
    "Stück",
    "Kurs",
    "Gebühr",
    "Steuer",
  ]);

  await expect(page.getByText("Keine Anlage- oder Steuerberatung", { exact: false }).first()).toBeVisible();

  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("export-pdf").click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^depotdoktor-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  const pdfBytes = readFileSync(await pdf.path());
  expect(pdfBytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(pdfBytes.byteLength).toBeGreaterThan(5000);

  const csvDownload = page.waitForEvent("download");
  await page.getByTestId("export-csv").click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toMatch(/^depotdoktor-transaktionen-\d{4}-\d{2}-\d{2}\.csv$/);
  const csvText = readFileSync(await csv.path(), "utf8");
  expect(csvText.startsWith("\uFEFFdate;datetime;broker;type;isin")).toBe(true);
  expect(csvText.trim().split("\r\n")).toHaveLength(9);

  await page.getByRole("tab", { name: "Performance" }).click();
  await expect(performance).toBeVisible();

  expect(outgoing).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
  expect(errors).toEqual([]);
});

test("Kacheln und Schaltflächen tragen die Stile aus den Workspace-Paketen", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await loadSample(page);

  for (const tile of [page.getByTestId("kpi-ttwror"), page.getByTestId("stat-tile").first()]) {
    const style = await tile.evaluate((element) => {
      const value = element.children[1] as HTMLElement;
      return { padding: getComputedStyle(element).paddingTop, fontSize: getComputedStyle(value).fontSize };
    });
    expect(style).toEqual({ padding: "16px", fontSize: "24px" });
  }

  await page.getByTestId("export-csv").focus();
  await page.keyboard.press("Shift+Tab");
  const pdfButton = page.getByTestId("export-pdf");
  await expect(pdfButton).toBeFocused();
  const ring = await pdfButton.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(ring).toContain("rgb(125, 95, 23)");

  const disabled = await page.getByRole("button", { name: "Andere Datei" }).evaluate((element) => {
    const button = element as HTMLButtonElement;
    button.disabled = true;
    const style = getComputedStyle(button);
    const result = { opacity: style.opacity, cursor: style.cursor };
    button.disabled = false;
    return result;
  });
  expect(disabled).toEqual({ opacity: "0.5", cursor: "not-allowed" });
});

test("Trade-Republic-Datei per Upload", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(tradeRepublicFixture);
  await expect(page.getByTestId("report-section")).toContainText("Trade Republic");
  await expect(page.getByTestId("report-section")).toContainText("8 Buchungen");
  await expect(page.getByTestId("kpi-ttwror")).toContainText("+2,40 %");
  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("ETF");
});

test("Scalable-Datei per Upload: übersprungene Zeile, gleicher Zeitraum, Hinweise zu Fondstyp und Assetklasse", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(scalableFixture);
  await expect(page.getByTestId("report-section")).toContainText("6 Buchungen · 1 übersprungen");
  await expect(page.getByTestId("kpi-ttwror")).toContainText("+2,40 %");
  await expect(page.getByTestId("kpi-ttwror")).toContainText("06.01.2026 bis 20.06.2026");
  await expect(page.getByTestId("kpi-irr")).toContainText("+5,51 %");

  await page.getByRole("tab", { name: "Allokation" }).click();
  await expect(page.getByTestId("allocation-asset-class")).toContainText("Nicht zugeordnet");
  await expect(page.getByTestId("allocation-unassigned-hint")).toHaveText("Nicht zugeordnet: Der Export enthält keine Assetklasse.");

  await page.getByRole("tab", { name: "Steuer" }).click();
  await expect(page.getByTestId("tax-position")).toHaveCount(2);
  const hints = page.getByTestId("tax-fund-type-hint");
  await expect(hints).toHaveCount(2);
  await expect(hints.first()).toHaveText("Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds. Bitte prüfen Sie den Fondstyp.");
  const fundTypeSelects = page.getByRole("combobox", { name: "Fondstyp" });
  await expect(fundTypeSelects).toHaveCount(2);
  for (const select of await fundTypeSelects.all()) {
    await expect(select).toHaveAccessibleDescription(/^Der Scalable-Export unterscheidet nicht zwischen Aktie und Fonds\./);
  }
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
  const error = page.getByTestId("parse-error");
  await expect(error).toContainText("Excel");
  await expect(error).toContainText("erneut aus der App bzw. dem Webportal Ihres Brokers herunter");
  await expect(error).not.toContainText("Speichern unter");
  await expect(page.getByTestId("report-section")).toHaveCount(0);
});

test("UTF-16-Export mit BOM wird gelesen", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles({
    name: "Transaktionen-UTF16.csv",
    mimeType: "text/csv",
    buffer: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tradeRepublicText, "utf16le")]),
  });
  await expect(page.getByTestId("report-section")).toContainText("Trade Republic");
  await expect(page.getByTestId("report-section")).toContainText("8 Buchungen");
  await expect(page.getByTestId("kpi-ttwror")).toContainText("+2,40 %");
});

test("Angesetzte Vorabpauschalen mindern den Veräußerungsgewinn, Andere Datei setzt sie zurück", async ({ page }) => {
  const priorYearSaleFile = {
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
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(priorYearSaleFile);
  await expect(page.getByTestId("report-section")).toContainText("2 Buchungen");
  await page.getByRole("tab", { name: "Steuer" }).click();
  const sale = page.getByTestId("tax-sale");
  const credit = sale.getByTestId("tax-sale-credit");
  const realizedTile = page.getByTestId("tax-realized-gain");
  await expect(sale).toHaveCount(1);
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("200,00 €");
  await expect(realizedTile).toContainText("Realisierte Gewinne 2026 (FIFO)");
  await expect(realizedTile).toContainText("200,00 €");
  await expect(page.getByTestId("tax-no-holding")).toHaveText("Keine Vorabpauschale: kein Bestand am 31.12.2026 (§ 18 Abs. 3 InvStG).");
  await expect(page.getByTestId("tax-prices-missing")).toHaveCount(0);
  await expect(page.getByTestId("tax-price-provisional")).toHaveCount(0);
  await expect(page.getByTestId("tax-vorabpauschale")).toHaveText(/^Vorabpauschale 2026\s*0,00\s€\s*Summe aller Positionen$/);
  await expect(credit).toHaveAccessibleName("Für diese Anteile in Vorjahren angesetzte Vorabpauschalen (€, optional)");
  await expect(credit).toHaveAccessibleDescription(/^Summe der Beträge, die Ihre Bank .* InvStG\.$/);

  await credit.fill("25,30");
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("174,70 €");
  await expect(sale).toContainText("angesetzte Vorabpauschalen 25,30 €");
  await expect(realizedTile).toContainText("174,70 €");
  await expect(page.getByRole("textbox", { name: "Kurs 01.01.2026" })).toHaveValue("100,00");
  await expect(page.getByRole("textbox", { name: "Kurs 31.12.2026" })).toHaveValue("120,00");

  await page.getByTestId("tax-year").selectOption("2025");
  await expect(page.getByRole("textbox", { name: "Kurs 01.01.2025" })).toHaveValue("");
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

  await credit.fill("25,30");
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("174,70 €");
  await page.getByRole("button", { name: "Andere Datei" }).click();
  await expect(page.getByTestId("report-section")).toHaveCount(0);
  await page.getByTestId("file-input").setInputFiles(priorYearSaleFile);
  await expect(page.getByTestId("report-section")).toContainText("2 Buchungen");
  await page.getByRole("tab", { name: "Steuer" }).click();
  await page.getByTestId("tax-year").selectOption("2026");
  await expect(credit).toHaveValue("");
  await expect(sale.getByTestId("tax-sale-gain")).toHaveText("200,00 €");
  await expect(sale).not.toContainText("angesetzte Vorabpauschalen 25,30 €");
  await expect(realizedTile).toContainText("200,00 €");
});

test("Kurse im Steuerreiter gelten je Steuerjahr, der Fondstyp für alle Jahre, Andere Datei setzt beides zurück", async ({ page }) => {
  const pricesPerYearFile = {
    name: "kurse-je-jahr.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "date;time;status;reference;description;assetType;type;isin;shares;price;amount;fee;tax;currency",
        '2025-03-03;09:00:00;Executed;"E2E0101";"Testfonds Welt UCITS ETF";Security;Buy;IE00TEST0001;10;100,00;-1000,00;0,00;0,00;EUR',
        '2026-01-15;09:00:00;Executed;"E2E0102";"Testfonds Welt UCITS ETF";Security;Buy;IE00TEST0001;5;110,00;-550,00;0,00;0,00;EUR',
        "",
      ].join("\n"),
      "utf8",
    ),
  };
  await page.goto("/projects/depotdoktor");
  await page.getByTestId("file-input").setInputFiles(pricesPerYearFile);
  await expect(page.getByTestId("report-section")).toContainText("2 Buchungen");
  await page.getByRole("tab", { name: "Steuer" }).click();

  const year = page.getByTestId("tax-year");
  const fundType = page.getByRole("combobox", { name: "Fondstyp" });
  const start = (y: number) => page.getByRole("textbox", { name: `Kurs 01.01.${y}` });
  const end = (y: number) => page.getByRole("textbox", { name: `Kurs 31.12.${y}` });
  const tiles = [
    { testId: "tax-vorabpauschale", label: (y: number) => `Vorabpauschale ${y}` },
    { testId: "tax-taxable", label: () => "Steuerpflichtig nach Teilfreistellung" },
    { testId: "tax-estimated-tax", label: () => "Geschätzte Steuer auf Vorabpauschale" },
  ];
  const expectTaxTiles = async (y: number, values: [string, string, string], provisional: boolean) => {
    for (const [index, tile] of tiles.entries()) {
      const element = page.getByTestId(tile.testId);
      await expect(element).toHaveText(new RegExp(`^${tile.label(y)}\\s*${values[index]}\\s€`));
      if (provisional) await expect(element).toContainText("vorläufig (Kurs aus dem Export)");
      else await expect(element).not.toContainText("vorläufig");
    }
  };
  const expectMissingTiles = async (y: number) => {
    for (const tile of tiles) {
      const element = page.getByTestId(tile.testId);
      await expect(element).toHaveText(new RegExp(`^${tile.label(y)}\\s*–\\s*Kurse eintragen`));
      await expect(element).not.toContainText("0,00 €");
    }
    await expect(page.getByTestId("tax-prices-missing")).toContainText("Kurse eintragen");
  };

  await expect(year).toHaveValue("2026");
  await expect(start(2026)).toHaveValue("100,00");
  await expect(end(2026)).toHaveValue("110,00");
  await expect(page.getByTestId("tax-price-provisional")).toHaveCount(2);
  await expectTaxTiles(2026, ["33,60", "23,52", "6,20"], true);

  await start(2026).fill("105,00");
  await end(2026).fill("125,00");
  await expect(page.getByTestId("tax-price-provisional")).toHaveCount(0);
  await expectTaxTiles(2026, ["35,28", "24,70", "6,51"], false);

  await year.selectOption("2025");
  await expect(start(2025)).toHaveValue("");
  await expect(end(2025)).toHaveValue("100,00");
  await expectMissingTiles(2025);

  await start(2025).fill("100,00");
  await end(2025).fill("110,00");
  await expectTaxTiles(2025, ["14,76", "10,33", "2,72"], false);

  await year.selectOption("2026");
  await expect(start(2026)).toHaveValue("105,00");
  await expect(end(2026)).toHaveValue("125,00");
  await expectTaxTiles(2026, ["35,28", "24,70", "6,51"], false);

  await fundType.selectOption("mixed");
  await expectTaxTiles(2026, ["35,28", "29,99", "7,91"], false);

  await year.selectOption("2025");
  await expect(fundType).toHaveValue("mixed");
  await expect(start(2025)).toHaveValue("100,00");
  await expect(end(2025)).toHaveValue("110,00");
  await expectTaxTiles(2025, ["14,76", "12,54", "3,31"], false);

  await page.getByRole("button", { name: "Andere Datei" }).click();
  await expect(page.getByTestId("report-section")).toHaveCount(0);
  await page.getByTestId("file-input").setInputFiles(pricesPerYearFile);
  await expect(page.getByTestId("report-section")).toContainText("2 Buchungen");
  await page.getByRole("tab", { name: "Steuer" }).click();

  await year.selectOption("2026");
  await expect(fundType).toHaveValue("equity");
  await expect(start(2026)).toHaveValue("100,00");
  await expect(end(2026)).toHaveValue("110,00");
  await expectTaxTiles(2026, ["33,60", "23,52", "6,20"], true);

  await year.selectOption("2025");
  await expect(fundType).toHaveValue("equity");
  await expect(start(2025)).toHaveValue("");
  await expect(end(2025)).toHaveValue("100,00");
  await expectMissingTiles(2025);
});

test("Beispieldatei im Steuerreiter: ohne Kurs 01.01. keine Schein-Steuer, mit Beispielkursen eine echte Rechnung", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await loadSample(page);
  await page.getByRole("tab", { name: "Steuer" }).click();

  const etf = taxPosition(page, "Testfonds Welt UCITS ETF");
  const etfStart = etf.getByRole("textbox", { name: "Kurs 01.01.2026" });
  const etfEnd = etf.getByRole("textbox", { name: "Kurs 31.12.2026" });
  await expect(etfStart).toHaveValue("");
  await expect(etfEnd).toHaveValue("80,00");
  await expect(etf.getByTestId("tax-prices-missing")).toContainText("Kurse eintragen");
  await expect(etfStart).toHaveAccessibleDescription("Kurse eintragen: Bitte Kurs am 01.01. und 31.12. als Dezimalzahl eintragen.");
  await expect(etfEnd).toHaveAccessibleDescription(
    "vorläufig (Kurs aus dem Export) Kurse eintragen: Bitte Kurs am 01.01. und 31.12. als Dezimalzahl eintragen.",
  );
  await expect(page.getByTestId("tax-vorabpauschale")).toHaveText(/^Vorabpauschale 2026\s*–\s*Kurse eintragen/);
  await expect(page.getByTestId("tax-estimated-tax")).not.toContainText("0,00 €");

  await etfStart.fill("80,00");
  await etfEnd.fill("95,00");
  await expect(etfStart).toHaveAccessibleDescription("");
  await expect(etfEnd).toHaveAccessibleDescription("");
  await expect(page.getByTestId("tax-vorabpauschale")).toHaveText(/^Vorabpauschale 2026\s*179,20\s€\s*Summe aller Positionen$/);
  await expect(page.getByTestId("tax-taxable")).toHaveText(/^Steuerpflichtig nach Teilfreistellung\s*125,44\s€$/);
  await expect(page.getByTestId("tax-estimated-tax")).toHaveText(/^Geschätzte Steuer auf Vorabpauschale\s*33,08\s€/);
  await expect(etf.getByTestId("position-tax")).toHaveText("33,08 €");
  await expect(etf.locator("thead th")).toHaveText([
    "Anteil",
    "Vorabpauschale",
    "Steuer",
    "Stück",
    "Monate entfallen",
    "Basisertrag",
    "Steuerpflichtig",
  ]);
});

test("Mobil 390 px: Reiterleiste einzeilig, Steuerergebnis ohne seitliches Scrollen sichtbar, Wischhinweis nur bei Überlauf", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/depotdoktor");
  await loadSample(page);

  const tabs = page.getByRole("tab");
  const tops = await tabs.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await page.getByRole("tab", { name: "Transaktionen" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Performance" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Transaktionen" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Transaktionen" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Steuer" }).click();
  const etf = taxPosition(page, "Testfonds Welt UCITS ETF");
  await etf.getByRole("textbox", { name: "Kurs 01.01.2026" }).fill("80,00");
  await etf.getByRole("textbox", { name: "Kurs 31.12.2026" }).fill("95,00");
  const region = etf.getByRole("region", { name: "Vorabpauschale Testfonds Welt UCITS ETF" });
  await expect(region).toBeVisible();
  const box = await region.boundingBox();
  expect(box).not.toBeNull();
  for (const name of ["Vorabpauschale", "Steuer"]) {
    const header = region.getByRole("columnheader", { name, exact: true });
    const headerBox = await header.boundingBox();
    expect(headerBox, name).not.toBeNull();
    expect(headerBox!.x, name).toBeGreaterThanOrEqual(box!.x);
    expect(headerBox!.x + headerBox!.width, name).toBeLessThanOrEqual(box!.x + box!.width + 0.5);
  }
  const taxCell = await etf.getByTestId("position-tax").boundingBox();
  expect(taxCell).not.toBeNull();
  expect(taxCell!.x + taxCell!.width).toBeLessThanOrEqual(box!.x + box!.width + 0.5);
  expect(taxCell!.x + taxCell!.width).toBeLessThanOrEqual(390);

  for (const tab of ["Steuer", "Transaktionen", "Performance", "Allokation"]) {
    await page.getByRole("tab", { name: tab }).click();
    const panel = page.getByRole("tabpanel");
    const regions = panel.locator('[role="region"][data-overflowing]');
    await expect(regions.first()).toBeAttached();
    const overflowing = await panel.locator('[role="region"][data-overflowing="true"]').count();
    await expect(panel.getByText("Tabelle seitlich wischen", { exact: true }), tab).toHaveCount(overflowing);
    const scrollWidth = await page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollWidth);
    expect(scrollWidth, tab).toBeLessThanOrEqual(390);
  }
  await page.getByRole("tab", { name: "Transaktionen" }).click();
  await expect(page.getByRole("tabpanel").locator('[role="region"][data-overflowing="true"]')).toHaveCount(1);
  await expect(page.getByTestId("scroll-shadow")).toHaveCount(1);
});

test("Rechtsseiten sind erreichbar und verlinkt", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await page.getByRole("navigation", { name: "Rechtliches" }).getByRole("link", { name: "Nutzungsbedingungen" }).click();
  await expect(page).toHaveURL(/\/nutzungsbedingungen$/);
  await expect(page.getByRole("heading", { name: "Nutzungsbedingungen", level: 1 })).toBeVisible();
  await expect(page.getByText("kein Angebot", { exact: false }).first()).toBeVisible();
  await page.goto("/impressum");
  await expect(page.getByRole("heading", { name: "Impressum", level: 1 })).toBeVisible();
  await expect(page.getByText("mirkandeniz52@gmail.com").first()).toBeVisible();
  await page.goto("/datenschutz");
  await expect(page.getByRole("heading", { name: "Datenschutzerklärung", level: 1 })).toBeVisible();
  await expect(page.getByText("Vercel Web Analytics und Speed Insights sind nicht aktiviert")).toBeVisible();
});

test("Disclaimer nennt § 2 Abs. 8 Satz 1 Nr. 10 WpHG", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  await expect(page.getByRole("main")).toContainText("im Sinne von § 2 Abs. 8 Satz 1 Nr. 10 WpHG");
  await expect(page.getByRole("main")).not.toContainText(/§\s85\sWpHG/);
});
