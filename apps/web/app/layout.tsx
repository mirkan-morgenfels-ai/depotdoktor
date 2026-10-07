import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE_NAME, siteUrl } from "@/lib/site";
import { fontVariables } from "./fonts";
import "./globals.css";

const DESCRIPTION =
  "Depot-Steuer- und Performance-Analyzer für Broker-CSV-Exporte: TTWROR, IRR, Volatilität, Max Drawdown, Allokation und geschätzte Vorabpauschale. Die Auswertung läuft vollständig im Browser.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1626",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={fontVariables}>
      <body className="flex min-h-screen flex-col bg-ivory font-sans text-ink antialiased">
        <a href="#main" className="skip-link">
          Zum Inhalt springen
        </a>
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
