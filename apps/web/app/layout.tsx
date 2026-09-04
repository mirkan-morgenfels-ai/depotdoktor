import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio – Mirkan Deniz Günkaya",
  description: "Projekte: DepotDoktor, KontoKlar, NetzRadar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <header className="border-b border-line bg-surface">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-lg">
              Mirkan Deniz Günkaya
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/projects/depotdoktor" className="hover:text-gold">
                DepotDoktor
              </Link>
              <Link href="/impressum" className="hover:text-gold">
                Impressum
              </Link>
              <Link href="/datenschutz" className="hover:text-gold">
                Datenschutz
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted">
          © 2026 Mirkan Deniz Günkaya · Quellcode unter MIT-Lizenz
        </footer>
      </body>
    </html>
  );
}
