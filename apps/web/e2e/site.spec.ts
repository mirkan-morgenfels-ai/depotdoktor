import { expect, test, type Page } from "@playwright/test";
import { AXE_WIDTHS, axeViolations, originOf, watchErrors } from "./helpers";

const LEGAL_PAGES = [
  { path: "/impressum", heading: "Impressum" },
  { path: "/datenschutz", heading: "Datenschutzerklärung" },
  { path: "/nutzungsbedingungen", heading: "Nutzungsbedingungen" },
];
const LEGAL_UPDATED = "07.10.2026";
const REPO_BASE = "https://github.com/mirkan-morgenfels-ai";
const DEPOTDOKTOR_REPO = `${REPO_BASE}/depotdoktor`;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://depotdoktor.vercel.app").replace(/\/+$/, "");
const HOME_TITLE = "Projekte · Mirkan Deniz Günkaya";
const PROJECT_TITLE = "DepotDoktor – Depot-Steuer- und Performance-Analyzer";
const PUBLIC_PATHS = ["/", "/projects/depotdoktor", ...LEGAL_PAGES.map((legal) => legal.path)];
const TABS = ["Performance", "Allokation", "Steuer", "Transaktionen"];

async function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).first().getAttribute("content");
}

test("start page lists the three projects", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Projekte" })).toBeVisible();
  await expect(page.getByTestId(/^project-/)).toHaveCount(3);
  await expect(page.getByRole("main")).not.toContainText("in Arbeit");
  await expect(page.getByRole("main")).not.toContainText("noch nicht veröffentlicht");

  await expect(page.getByTestId("project-depotdoktor").getByRole("link", { name: /^Zum Projekt/ })).toHaveAttribute(
    "href",
    "/projects/depotdoktor",
  );

  for (const [slug, href] of [
    ["kontoklar", "https://kontoklar-eight.vercel.app/projects/kontoklar"],
    ["netzradar", "https://netzradar.vercel.app/projects/netzradar"],
  ] as const) {
    const link = page.getByTestId(`project-${slug}`).getByRole("link", { name: /^Zum Projekt/ });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).not.toHaveAttribute("target", /.+/);
    await expect(link).toContainText("(externe Seite)");
  }

  for (const slug of ["depotdoktor", "kontoklar", "netzradar"]) {
    const repo = page.getByTestId(`project-${slug}`).getByRole("link", { name: /^Quellcode/ });
    await expect(repo).toHaveAttribute("href", new RegExp(`^${REPO_BASE}/${slug}$`));
    await expect(repo).toHaveAttribute("rel", "noopener noreferrer");
    await expect(repo).not.toHaveAttribute("target", /.+/);
  }
  await expect(page.locator("a[target]")).toHaveCount(0);
});

test("main navigation and skip link are present", async ({ page }) => {
  await page.goto("/projects/depotdoktor");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  const links = nav.getByRole("list").getByRole("link");
  await expect(links).toHaveCount(4);
  await expect(links.nth(0)).toHaveText("Start");
  await expect(links.nth(1)).toHaveText("DepotDoktor");
  await expect(links.nth(2)).toHaveAccessibleName("KontoKlar (externe Seite)");
  await expect(links.nth(3)).toHaveAccessibleName("NetzRadar (externe Seite)");
  for (const index of [2, 3]) {
    await expect(links.nth(index)).toHaveAttribute("href", /^https:\/\//);
    await expect(links.nth(index)).toHaveAttribute("rel", "noopener noreferrer");
    await expect(links.nth(index)).not.toHaveAttribute("target", /.+/);
  }
  await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  await expect(links.nth(0)).not.toHaveAttribute("aria-current", /.+/);
  await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");
  await expect(nav.getByRole("link", { name: /Impressum|Datenschutz|Nutzungsbedingungen/ })).toHaveCount(0);

  const legalNav = page.getByRole("navigation", { name: "Rechtliches" });
  await expect(legalNav.getByRole("link")).toHaveText(["Impressum", "Datenschutz", "Nutzungsbedingungen"]);

  await page.goto("/");
  await expect(nav.getByRole("link", { name: "Start" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "DepotDoktor", exact: true })).not.toHaveAttribute("aria-current", /.+/);
});

test("footer and project page link the public repository", async ({ page }) => {
  await page.goto("/");
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
  await expect(privacy).toContainText("Diese Seite verlinkt auf die Projekte KontoKlar und NetzRadar");
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
  await expect(page.getByRole("main").getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("main").getByRole("link", { name: "Zu DepotDoktor" })).toHaveAttribute("href", "/projects/depotdoktor");
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
  expect(titles["/"]).toBe(HOME_TITLE);
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

    for (const [path, violations] of Object.entries(results)) {
      expect(violations, path).toEqual([]);
    }
    expect(errors.filter((error) => !error.includes("status of 404"))).toEqual([]);
  });
}
