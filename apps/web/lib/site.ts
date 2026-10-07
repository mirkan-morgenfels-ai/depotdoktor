export interface Project {
  slug: string;
  code: string;
  number: string;
  topic: string;
  kicker: string;
  title: string;
  description: string;
  href: string;
  external: boolean;
  repo: string;
}

export interface NavLink {
  href: string;
  label: string;
  external: boolean;
}

export const DEFAULT_SITE_URL = "https://depotdoktor.vercel.app";

export const SITE_NAME = "DepotDoktor";

export const OWNER_NAME = "Mirkan Deniz Günkaya";

export const GITHUB_PROFILE_URL = "https://github.com/mirkan-morgenfels-ai";

export const REPO_URL = "https://github.com/mirkan-morgenfels-ai/depotdoktor";

export const HOME_DESCRIPTION =
  "Drei Portfolio-Projekte zu Finanzdaten, maschinellem Lernen und Graph-ML: DepotDoktor, KontoKlar und NetzRadar, jeweils mit öffentlichem Quellcode auf GitHub.";

export const PROJECTS: readonly Project[] = [
  {
    slug: "depotdoktor",
    code: "K1",
    number: "01",
    topic: "Finanzdaten",
    kicker: "Projekt 01",
    title: "DepotDoktor",
    description:
      "Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte. Die Auswertung läuft vollständig im Browser.",
    href: "/projects/depotdoktor",
    external: false,
    repo: REPO_URL,
  },
  {
    slug: "kontoklar",
    code: "K2",
    number: "02",
    topic: "Maschinelles Lernen",
    kicker: "Projekt 02",
    title: "KontoKlar",
    description: "Kategorisiert Bankumsätze aus CSV-Exporten und zeigt, wohin das Geld geht.",
    href: "https://kontoklar-eight.vercel.app/projects/kontoklar",
    external: true,
    repo: "https://github.com/mirkan-morgenfels-ai/kontoklar",
  },
  {
    slug: "netzradar",
    code: "K3",
    number: "03",
    topic: "Graph-ML",
    kicker: "Projekt 03",
    title: "NetzRadar",
    description:
      "Anomalie-Erkennung in Transaktionsnetzwerken: klassische Baseline gegen Graph Neural Networks, mit zeitlichem Split und PR-AUC.",
    href: "https://netzradar.vercel.app/projects/netzradar",
    external: true,
    repo: "https://github.com/mirkan-morgenfels-ai/netzradar",
  },
];

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Start", external: false },
  ...PROJECTS.map((project) => ({ href: project.href, label: project.title, external: project.external })),
  { href: GITHUB_PROFILE_URL, label: "GitHub", external: true },
];

export const LEGAL_LINKS: readonly NavLink[] = [
  { href: "/impressum", label: "Impressum", external: false },
  { href: "/datenschutz", label: "Datenschutz", external: false },
  { href: "/nutzungsbedingungen", label: "Nutzungsbedingungen", external: false },
];

export const SITEMAP_PATHS: readonly string[] = ["/", "/projects/depotdoktor", ...LEGAL_LINKS.map((link) => link.href)];

export function repoUrl(path = "", kind: "blob" | "tree" = "blob"): string {
  const trimmed = path.replace(/^\/+/, "");
  return trimmed === "" ? REPO_URL : `${REPO_URL}/${kind}/main/${trimmed}`;
}

export const LICENSE_URL = repoUrl("LICENSE");

export const VERIFICATION_URL = repoUrl("docs/verifikation.md");

export function siteUrl(value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): URL {
  const trimmed = value?.trim();
  return new URL(trimmed ? trimmed : DEFAULT_SITE_URL);
}

export function projectDisplayUrl(slug: string, base: URL = siteUrl()): string {
  const project = PROJECTS.find((entry) => entry.slug === slug);
  if (!project) throw new Error(`Unbekanntes Projekt: ${slug}`);
  const url = project.external ? new URL(project.href) : new URL(project.href, base);
  return `${url.host}${url.pathname}`;
}
