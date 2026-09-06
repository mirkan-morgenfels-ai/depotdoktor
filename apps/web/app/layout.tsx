import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio – Mirkan Deniz Günkaya",
  description: "Projekte: DepotDoktor, KontoKlar, NetzRadar",
};

const NAV_LINKS = [
  { href: "/projects/depotdoktor", label: "DepotDoktor" },
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/nutzungsbedingungen", label: "Nutzungsbedingungen" },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a href="#main" className="skip-link">
          Zum Inhalt springen
        </a>
        <header className="border-b border-line bg-surface">
          <nav
            aria-label="Hauptnavigation"
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4"
          >
            <Link href="/" className="font-serif text-lg whitespace-nowrap">
              Mirkan Deniz Günkaya
            </Link>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-gold-deep">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
        <footer className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 px-6 py-8 text-xs text-muted">
          <span>© 2026 Mirkan Deniz Günkaya · Privates, nicht-kommerzielles Projekt · Quellcode unter MIT-Lizenz</span>
          {NAV_LINKS.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gold-deep">
              {link.label}
            </Link>
          ))}
        </footer>
      </body>
    </html>
  );
}
