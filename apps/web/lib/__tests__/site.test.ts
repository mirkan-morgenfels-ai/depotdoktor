import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SITE_URL,
  LEGAL_LINKS,
  LICENSE_URL,
  NAV_LINKS,
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
    expect(PROJECTS.map((project) => project.kicker)).toEqual(["Projekt K1", "Projekt K2", "Projekt K3"]);
  });

  it("links DepotDoktor internally and the other projects over https", () => {
    const [depotdoktor, ...others] = PROJECTS;
    expect(depotdoktor?.href).toBe("/projects/depotdoktor");
    expect(depotdoktor?.external).toBe(false);
    for (const project of others) {
      expect(project.external).toBe(true);
      expect(new URL(project.href).protocol).toBe("https:");
    }
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
      "Anomalie-Erkennung in Transaktionsnetzwerken: klassische Baseline gegen Graph Neural Networks, mit zeitlichem Split und PR-AUC.",
    );
  });
});

describe("navigation", () => {
  it("offers start and the three projects in the main navigation", () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual(["Start", "DepotDoktor", "KontoKlar", "NetzRadar"]);
    expect(NAV_LINKS.map((link) => link.external)).toEqual([false, false, true, true]);
  });

  it("offers the three legal pages", () => {
    expect(LEGAL_LINKS.map((link) => link.href)).toEqual(["/impressum", "/datenschutz", "/nutzungsbedingungen"]);
  });

  it("lists the five public routes for the sitemap", () => {
    expect(SITEMAP_PATHS).toEqual(["/", "/projects/depotdoktor", "/impressum", "/datenschutz", "/nutzungsbedingungen"]);
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
    expect(DEFAULT_SITE_URL).toBe("https://depotdoktor.vercel.app");
    expect(siteUrl("").href).toBe("https://depotdoktor.vercel.app/");
    expect(siteUrl("   ").href).toBe("https://depotdoktor.vercel.app/");
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
    expect(projectDisplayUrl("depotdoktor", siteUrl(""))).toBe("depotdoktor.vercel.app/projects/depotdoktor");
    expect(projectDisplayUrl("netzradar", siteUrl(""))).toBe("netzradar.vercel.app/projects/netzradar");
    expect(() => projectDisplayUrl("unbekannt")).toThrow();
  });
});
