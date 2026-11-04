import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { AXE_WIDTHS, axeViolations, originOf, PRIOR_YEAR_SALE_FILE, watchErrors } from "./helpers";

const SCALABLE_FIXTURE = resolve(__dirname, "../../../packages/csv/fixtures/scalable-synthetic.csv");

const LEGAL_PAGES = [
  { path: "/impressum", heading: "Impressum" },
  { path: "/datenschutz", heading: "Datenschutzerklärung" },
  { path: "/nutzungsbedingungen", heading: "Nutzungsbedingungen" },
];
const LEGAL_UPDATED = "01.11.2026";
const REPO_BASE = "https://github.com/mirkan-morgenfels-ai";
const DEPOTDOKTOR_REPO = `${REPO_BASE}/depotdoktor`;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://depotdoktor.mirkandeniz.de").replace(/\/+$/, "");
const LEGACY_HOST = "depotdoktor.vercel.app";
const PORTFOLIO_URL = "https://mirkandeniz.de";
const PORTFOLIO_HOME_URL = `${PORTFOLIO_URL}/#start`;
const PROJECT_TITLE = "DepotDoktor – Depot-Steuer- und Performance-Analyzer";
const PUBLIC_PATHS = ["/projects/depotdoktor", ...LEGAL_PAGES.map((legal) => legal.path)];
const TABS = ["Performance", "Allokation", "Steuer", "Transaktionen"];

async function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).first().getAttribute("content");
}

test("start address opens DepotDoktor directly", async ({ page, request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers()["location"]).toBe("/projects/depotdoktor");
  await page.goto("/");
  await expect(page).toHaveURL(/\/projects\/depotdoktor$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the former Vercel address forwards to the subdomain of mirkandeniz.de", async ({ request }) => {
  test.skip(new URL(SITE_URL).host === LEGACY_HOST, "NEXT_PUBLIC_SITE_URL zeigt noch auf die alte Adresse");
  const page = await request.get("/projects/depotdoktor?quelle=alt", { headers: { host: LEGACY_HOST }, maxRedirects: 0 });
  expect(page.status()).toBe(308);
  expect(page.headers()["location"]).toBe(`${SITE_URL}/projects/depotdoktor?quelle=alt`);
  const root = await request.get("/", { headers: { host: LEGACY_HOST }, maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(root.headers()["location"]).toBe(SITE_URL);
});

test("main navigation, way back to mirkandeniz.de and skip link are present", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const links = nav.getByRole("list").getByRole("link");
  await expect(links).toHaveCount(4);
  await expect(links.nth(0)).toHaveText("DepotDoktor");
  await expect(links.nth(1)).toHaveAccessibleName("KontoKlar (externe Seite)");
  await expect(links.nth(2)).toHaveAccessibleName("NetzRadar (externe Seite)");
  await expect(links.nth(3)).toHaveAccessibleName("Alle Projekte (externe Seite)");
  await expect(links.nth(1)).toHaveAttribute("href", "https://kontoklar.mirkandeniz.de/projects/kontoklar");
  await expect(links.nth(2)).toHaveAttribute("href", "https://netzradar.mirkandeniz.de/projects/netzradar");
  await expect(links.nth(3)).toHaveAttribute("href", `${PORTFOLIO_URL}/projekte`);
  for (const index of [1, 2, 3]) {
    await expect(links.nth(index)).toHaveAttribute("rel", "noopener noreferrer");
    await expect(links.nth(index)).not.toHaveAttribute("target", /.+/);
  }
  await expect(links.nth(0)).toHaveAttribute("aria-current", "page");

  const home = page.locator("header").getByTestId("portfolio-link");
  await expect(home).toHaveAttribute("href", PORTFOLIO_HOME_URL);
  await expect(home).toHaveAttribute("rel", "noopener noreferrer");
  await expect(home).not.toHaveAttribute("target", /.+/);
  await expect(home).toHaveAccessibleName(/^Mirkan Deniz.*\(externe Seite\)$/);
  await expect(home).toContainText("mirkandeniz.de");

  await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");
  await expect(nav.getByRole("link", { name: /Impressum|Datenschutz|Nutzungsbedingungen/ })).toHaveCount(0);

  const legalNav = page.getByRole("navigation", { name: "Rechtliches" });
  await expect(legalNav.getByRole("link")).toHaveText(["Impressum", "Datenschutz", "Nutzungsbedingungen"]);
});

test("footer and project page link the public repository and mirkandeniz.de", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  const portfolio = page.getByTestId("footer-portfolio-link");
  await expect(portfolio).toHaveAttribute("href", PORTFOLIO_HOME_URL);
  await expect(portfolio).toHaveAttribute("rel", "noopener noreferrer");
  await expect(portfolio).toHaveAccessibleName("mirkandeniz.de (externe Seite)");
  await expect(page.locator("footer").getByTestId("portfolio-link")).toHaveAttribute("href", PORTFOLIO_HOME_URL);
  const footerLink = page.getByTestId("footer-repo-link");
  await expect(footerLink).toHaveAttribute("href", DEPOTDOKTOR_REPO);
  await expect(footerLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(footerLink).toHaveAccessibleName("Quellcode auf GitHub (externe Seite)");
  await expect(page.locator("footer")).toContainText("Quellcode auf GitHub (externe Seite) (MIT-Lizenz)");

  await page.goto("/projects/depotdoktor");
  const about = page.getByTestId("about-project");
  await expect(about.getByRole("heading", { level: 2, name: "Über das Projekt" })).toBeVisible();
  await expect(page.getByTestId("project-repo-link")).toHaveAttribute("href", DEPOTDOKTOR_REPO);
  await expect(page.getByTestId("verification-link")).toHaveAttribute("href", `${DEPOTDOKTOR_REPO}/blob/main/docs/verifikation.md`);
  await expect(page.getByRole("main")).toContainText(
    "DepotDoktor berechnet aus dem Transaktionsexport von Trade Republic oder Scalable Capital die zeitgewichtete Rendite (TTWROR)",
  );
  const external = page.locator(`a[href^="${REPO_BASE}"]`);
  for (const link of await external.all()) {
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(page.locator("a[target]")).toHaveCount(0);

  for (const path of ["/impressum", "/nutzungsbedingungen"]) {
    await page.goto(path);
    await expect(page.getByRole("main").getByRole("link", { name: /^MIT-Lizenz/ })).toHaveAttribute(
      "href",
      `${DEPOTDOKTOR_REPO}/blob/main/LICENSE`,
    );
    await expect(page.getByRole("main")).toContainText("Der Quellcode ist öffentlich unter github.com/mirkan-morgenfels-ai/depotdoktor");
  }

  await page.goto("/datenschutz");
  const privacy = page.getByRole("main");
  await expect(privacy).toContainText("Diese Seite verlinkt auf die Website mirkandeniz.de und die Projekte KontoKlar und NetzRadar");
  await expect(privacy).toContainText("Quellcode-Repositories bei GitHub (GitHub, Inc., USA)");
  await expect(privacy.getByRole("link", { name: /^Datenschutzerklärung von Vercel/ })).toHaveAttribute(
    "href",
    "https://vercel.com/legal/privacy-notice",
  );
  await expect(privacy).not.toContainText("keine weiteren Anfragen");
});

for (const legal of LEGAL_PAGES) {
  test(`legal page ${legal.path} renders`, async ({ page }) => {
    await page.goto(legal.path);
    await expect(page.getByRole("heading", { level: 1, name: legal.heading })).toBeVisible();
    await expect(page.getByText(`Stand: ${LEGAL_UPDATED}`, { exact: true })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Platzhalter");
    await expect(page.getByRole("main")).not.toContainText(/[[\]]/);
  });
}

test("no page overflows horizontally at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    await page.waitForLoadState("load");
    const scrollWidth = await page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollWidth);
    expect(scrollWidth, path).toBeLessThanOrEqual(320);
  }
});

test("unknown paths answer 404 with a noindex title", async ({ page }) => {
  const response = await page.goto("/gibt-es-nicht");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" })).toBeVisible();
  await expect(page).toHaveTitle("Seite nicht gefunden · DepotDoktor");
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Zu DepotDoktor" })).toHaveAttribute("href", "/projects/depotdoktor");
  const website = page.getByRole("main").getByRole("link", { name: "Zur Website mirkandeniz.de (externe Seite)" });
  await expect(website).toHaveAttribute("href", PORTFOLIO_HOME_URL);
  await expect(website).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator("body")).not.toContainText("This page could not be found");
  const robots = await page.locator('meta[name="robots"]').evaluateAll((metas) =>
    metas.map((meta) => meta.getAttribute("content") ?? ""),
  );
  expect(robots.length).toBeGreaterThan(0);
  for (const content of robots) expect(content).toContain("noindex");
});

test("pages carry canonical links, link previews and distinct titles", async ({ page, request }) => {
  const titles: Record<string, string> = {};
  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    titles[path] = await page.title();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).not.toBeNull();
    expect(new URL(canonical ?? "").origin, path).toBe(SITE_URL);
    expect(new URL(canonical ?? "").pathname, path).toBe(path);
    expect(await metaContent(page, 'meta[property="og:url"]'), path).toBe(canonical);
    expect(await metaContent(page, 'meta[property="og:site_name"]'), path).toBe("DepotDoktor");
    expect(await metaContent(page, 'meta[property="og:title"]'), path).toBe(titles[path]);
    expect(await metaContent(page, 'meta[property="og:description"]'), path).toBeTruthy();
    expect(await metaContent(page, 'meta[name="twitter:card"]'), path).toBe("summary_large_image");
    const image = await metaContent(page, 'meta[property="og:image"]');
    expect(image, path).toMatch(/^https:\/\//);
    expect(image, path).not.toContain("localhost");
    expect(new URL(image ?? "").origin, path).toBe(SITE_URL);
    const local = await request.get(new URL(image ?? "").pathname + new URL(image ?? "").search);
    expect(local.status(), path).toBe(200);
    expect(local.headers()["content-type"], path).toContain("image/png");
  }
  expect(titles["/projects/depotdoktor"]).toBe(PROJECT_TITLE);
  expect(titles["/impressum"]).toBe("Impressum · DepotDoktor");
  expect(titles["/datenschutz"]).toBe("Datenschutzerklärung · DepotDoktor");
  expect(titles["/nutzungsbedingungen"]).toBe("Nutzungsbedingungen · DepotDoktor");
});

test("sitemap and robots.txt describe the public pages", async ({ request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const path of PUBLIC_PATHS) {
    expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
  }
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  for (const path of ["/apple-icon", "/opengraph-image"]) {
    const image = await request.get(path);
    expect(image.status(), path).toBe(200);
    expect(image.headers()["content-type"], path).toContain("image/png");
  }
  const icon = await request.get("/icon.svg");
  expect(icon.status()).toBe(200);
  const svg = await icon.text();
  expect(svg).toContain('aria-label="DepotDoktor"');
  expect(svg).not.toContain("<text");
});

test("pages only send same-origin GET requests", async ({ page, baseURL }) => {
  const origin = originOf(baseURL);
  const violations: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== origin || request.method() !== "GET") {
      violations.push(`${request.method()} ${request.url()}`);
    }
  });

  for (const path of PUBLIC_PATHS) {
    await page.goto(path);
    await page.waitForLoadState("load");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  expect(violations).toEqual([]);
});

for (const width of AXE_WIDTHS) {
  test(`pages have no axe violations at ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width, height: 900 });
    const results: Record<string, string[]> = {};
    for (const path of [...PUBLIC_PATHS.filter((entry) => entry !== "/projects/depotdoktor"), "/gibt-es-nicht"]) {
      await page.goto(path);
      await page.waitForLoadState("load");
      results[path] = await axeViolations(page);
    }

    await page.goto("/projects/depotdoktor");
    results["/projects/depotdoktor (ohne Datei)"] = await axeViolations(page);
    await page.getByRole("button", { name: "Beispieldatei laden" }).click();
    await expect(page.getByTestId("report-section")).toBeVisible();
    for (const tab of TABS) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
      results[`/projects/depotdoktor (${tab})`] = await axeViolations(page);
    }

    await page.getByRole("button", { name: "Andere Datei" }).click();
    await page.getByTestId("file-input").setInputFiles(SCALABLE_FIXTURE);
    await page.getByRole("tab", { name: "Steuer" }).click();
    await expect(page.getByTestId("tax-fund-type-missing")).toHaveCount(2);
    results["/projects/depotdoktor (Steuer, Scalable ohne Fondstyp)"] = await axeViolations(page);

    await page.getByRole("button", { name: "Andere Datei" }).click();
    await page.getByTestId("file-input").setInputFiles(PRIOR_YEAR_SALE_FILE);
    await page.getByRole("tab", { name: "Steuer" }).click();
    await page.getByTestId("tax-year").selectOption("2026");
    await expect(page.getByTestId("tax-sale-credit-fund-type")).toBeVisible();
    results["/projects/depotdoktor (Steuer, Verkauf ohne Fondstyp)"] = await axeViolations(page);

    for (const [path, violations] of Object.entries(results)) {
      expect(violations, path).toEqual([]);
    }
    expect(errors.filter((error) => !error.includes("status of 404"))).toEqual([]);
  });
}

type ClickInit = { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean; button?: number };

test("the way back to mirkandeniz.de shows a short transition", async ({ page }) => {
  await page.route(`${PORTFOLIO_URL}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Website</title><p>Website</p>" }),
  );
  await page.goto("/projects/depotdoktor");
  await expect(page.locator("html")).toHaveAttribute("data-transition-ready", "");
  await page.locator("header").getByTestId("portfolio-link").click();
  const overlay = page.locator('[data-portfolio-transition="mirkandeniz.de"]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText("Zurück zur Website");
  await expect(overlay).toContainText("Mirkan Deniz");
  await page.waitForURL(PORTFOLIO_HOME_URL);
  await expect(page.locator("p")).toHaveText("Website");
});

test("the transition also leads to the sister projects and leaves modifier clicks and reduced motion alone", async ({ page }) => {
  const sister = "https://kontoklar.mirkandeniz.de/projects/kontoklar";
  await page.route(`${new URL(sister).origin}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>App</title><p>App</p>" }),
  );
  await page.goto("/projects/depotdoktor");
  await expect(page.locator("html")).toHaveAttribute("data-transition-ready", "");
  const link = page.getByRole("navigation", { name: "Hauptnavigation" }).locator(`a[href="${sister}"]`);
  const prevented = (inits: ClickInit[]) =>
    link.evaluate((element, list) => {
      const results: boolean[] = [];
      const record = (event: Event) => {
        results.push(event.defaultPrevented);
        event.preventDefault();
      };
      window.addEventListener("click", record);
      for (const init of list) element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
      window.removeEventListener("click", record);
      return results;
    }, inits);
  expect(await prevented([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])).toEqual([false, false, false, false, false]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await prevented([{}])).toEqual([false]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-portfolio-transition]")).toHaveCount(0);
  await link.click();
  await expect(page.locator(`[data-portfolio-transition="${new URL(sister).host}"]`)).toContainText("Weiter zum Projekt");
  await page.waitForURL(sister);
  await expect(page.locator("p")).toHaveText("App");
});
