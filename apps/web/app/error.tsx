"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col justify-center gap-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-bordeaux">Fehler</p>
      <h1 className="font-serif text-3xl break-words hyphens-auto">Etwas ist schiefgelaufen</h1>
      <p className="text-muted">
        Die Seite konnte nicht dargestellt werden. Bitte versuchen Sie es erneut oder kehren Sie zur Startseite zurück.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-ink bg-ink px-3 py-1.5 font-medium text-paper hover:border-bordeaux hover:bg-bordeaux"
        >
          Erneut versuchen
        </button>
        <Link href="/" className="self-center text-green underline underline-offset-4 hover:text-gold-deep">
          Zur Startseite
        </Link>
      </div>
    </section>
  );
}
