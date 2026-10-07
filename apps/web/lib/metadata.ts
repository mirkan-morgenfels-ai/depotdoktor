import type { Metadata } from "next";
import { SITE_NAME } from "./site";

export const OG_IMAGE_PATH = "/opengraph-image";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_IMAGE_ALT = "DepotDoktor – Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte";

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  absolute?: boolean;
}

export function fullTitle(title: string, absolute = false): string {
  return absolute ? title : `${title} · ${SITE_NAME}`;
}

export function pageMetadata({ title, description, path, absolute = false }: PageMetadataInput): Metadata {
  const shown = fullTitle(title, absolute);
  const image = { url: OG_IMAGE_PATH, ...OG_IMAGE_SIZE, alt: OG_IMAGE_ALT };
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: SITE_NAME,
      title: shown,
      description,
      url: path,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: shown, description, images: [image] },
  };
}
