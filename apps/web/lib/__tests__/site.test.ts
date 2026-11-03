import { afterEach, describe, expect, it, vi } from "vitest";
import { transitionDestination } from "../../components/site/transition";
import {
  DEFAULT_SITE_URL,
  GITHUB_PROFILE_URL,
  LEGACY_HOSTS,
  LEGAL_LINKS,
  LICENSE_URL,
  NAV_LINKS,
  PORTFOLIO_HOME_URL,
  PORTFOLIO_LABEL,
  PORTFOLIO_PROJECTS_URL,
  PORTFOLIO_URL,
  PROJECT_PATH,
  PROJECTS,
  REPO_URL,
  SITEMAP_PATHS,
  projectDisplayUrl,
  repoUrl,
  siteUrl,
} from "../site";

describe("PROJECTS", () => {
  it("lists exactly the three portfolio projects in order", () => {
    expect(PROJECTS.map((project) => project.slug)).toEqual(["depotdoktor", "kontoklar", "netzradar"]);
    expect(PROJECTS.map((project) => project.code)).toEqual(["K1", "K2", "K3"]);
    expect(PROJECTS.map((project) => project.kicker)).toEqual(["Projekt 01", "Projekt 02", "Projekt 03"]);
    expect(PROJECTS.map((project) => project.number)).toEqual(["01", "02", "03"]);
    expect(PROJECTS.map((project) => project.topic)).toEqual(["Finanzdaten", "Maschinelles Lernen", "Graph-ML"]);
  });

  it("links DepotDoktor internally and the other projects on their mirkandeniz.de subdomains", () => {
    const [depotdoktor, ...others] = PROJECTS;
    expect(depotdoktor?.href).toBe("/projects/depotdoktor");
    expect(depotdoktor?.href).toBe(PROJECT_PATH);
    expect(depotdoktor?.external).toBe(false);
    expect(others.map((project) => project.href)).toEqual([
      "https://kontoklar.mirkandeniz.de/projects/kontoklar",
      "https://netzradar.mirkandeniz.de/projects/netzradar",
    ]);
    for (const project of others) expect(project.external).toBe(true);
  });

  it("points every project to its public repository", () => {
    for (const project of PROJECTS) {
      expect(project.repo).toBe(`https://github.com/mirkan-morgenfels-ai/${project.slug}`);
    }
    expect(REPO_URL).toBe("https://github.com/mirkan-morgenfels-ai/depotdoktor");
  });

  it("uses the same project descriptions as the sibling sites", () => {
    expect(PROJECTS[0]?.description).toBe(
      "Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte. Die Auswertung läuft vollständig im Browser.",
    );
    expect(PROJECTS[1]?.description).toBe("Kategorisiert Bankumsätze aus CSV-Exporten und zeigt, wohin das Geld geht.");
    expect(PROJECTS[2]?.description).toBe(
      "Anomalie-Erkennung in Transaktionsnetzwerken: klassische Baselines und Gradient Boosting gegen Graph Neural Networks, mit zeitlichem Split und PR-AUC.",
    );
  });

});

describe("navigation", () => {
  it("offers the three projects and the project overview on mirkandeniz.de in the main navigation", () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual(["DepotDoktor", "KontoKlar", "NetzRadar", "Alle Projekte"]);
    expect(NAV_LINKS.map((link) => link.external)).toEqual([false, true, true, true]);
    expect(NAV_LINKS.at(-1)?.href).toBe("https://mirkandeniz.de/projekte");
    expect(PORTFOLIO_PROJECTS_URL).toBe(`${PORTFOLIO_URL}/projekte`);
    expect(GITHUB_PROFILE_URL).toBe("https://github.com/mirkan-morgenfels-ai");
  });

  it("leads back to the website mirkandeniz.de", () => {
    expect(PORTFOLIO_URL).toBe("https://mirkandeniz.de");
    expect(PORTFOLIO_HOME_URL).toBe("https://mirkandeniz.de/#start");
    expect(PORTFOLIO_LABEL).toBe(new URL(PORTFOLIO_URL).host);
  });

  it("offers the three legal pages", () => {
    expect(LEGAL_LINKS.map((link) => link.href)).toEqual(["/impressum", "/datenschutz", "/nutzungsbedingungen"]);
  });

  it("lists the four public routes for the sitemap, without the redirecting start address", () => {
    expect(SITEMAP_PATHS).toEqual(["/projects/depotdoktor", "/impressum", "/datenschutz", "/nutzungsbedingungen"]);
  });
});

describe("repository links", () => {
  it("builds file and folder links on main", () => {
    expect(LICENSE_URL).toBe("https://github.com/mirkan-morgenfels-ai/depotdoktor/blob/main/LICENSE");
    expect(repoUrl("docs/screenshots", "tree")).toBe("https://github.com/mirkan-morgenfels-ai/depotdoktor/tree/main/docs/screenshots");
    expect(repoUrl()).toBe(REPO_URL);
  });
});

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the live address for an empty value", () => {
    expect(DEFAULT_SITE_URL).toBe("https://depotdoktor.mirkandeniz.de");
    expect(siteUrl("").href).toBe("https://depotdoktor.mirkandeniz.de/");
    expect(siteUrl("   ").href).toBe("https://depotdoktor.mirkandeniz.de/");
  });

  it("redirects only the two former Vercel addresses", () => {
    expect(LEGACY_HOSTS).toEqual(["depotdoktor.vercel.app", "ai-project-1-web.vercel.app"]);
    expect(LEGACY_HOSTS).not.toContain(siteUrl("").host);
  });

  it("uses a configured value", () => {
    expect(siteUrl("https://depotdoktor.example").href).toBe("https://depotdoktor.example/");
  });

  it("reads NEXT_PUBLIC_SITE_URL when no value is passed", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.org");
    expect(siteUrl().href).toBe("https://example.org/");
  });

  it("rejects a malformed value", () => {
    expect(() => siteUrl("kein url")).toThrow();
  });

  it("shows the project address without protocol", () => {
    expect(projectDisplayUrl("depotdoktor", siteUrl(""))).toBe("depotdoktor.mirkandeniz.de/projects/depotdoktor");
    expect(projectDisplayUrl("netzradar", siteUrl(""))).toBe("netzradar.mirkandeniz.de/projects/netzradar");
    expect(() => projectDisplayUrl("unbekannt")).toThrow();
  });
});

describe("transitionDestination", () => {
  it("names the website and the sister projects as destinations of the transition", () => {
    expect(transitionDestination(PORTFOLIO_HOME_URL)).toEqual({ eyebrow: "Zurück zur Website", title: "Mirkan", accent: "Deniz", host: "mirkandeniz.de" });
    expect(transitionDestination(PORTFOLIO_PROJECTS_URL)?.host).toBe(PORTFOLIO_LABEL);
    expect(transitionDestination("https://kontoklar.mirkandeniz.de/projects/kontoklar")).toEqual({
      eyebrow: "Weiter zum Projekt",
      title: "KontoKlar",
      accent: null,
      host: "kontoklar.mirkandeniz.de",
    });
    expect(transitionDestination(REPO_URL)).toBeNull();
    expect(transitionDestination(GITHUB_PROFILE_URL)).toBeNull();
    expect(transitionDestination("/impressum")).toBeNull();
  });
});
