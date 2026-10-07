import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-3xl break-words hyphens-auto">{title}</h1>
      <p className="mt-2 text-xs text-muted">Stand: {updated}</p>
      <div className="mt-8 space-y-8 text-[15px] leading-relaxed">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noopener noreferrer" className="text-green underline underline-offset-4 hover:text-gold-deep">
      {children}
      <span className="sr-only"> (externe Seite)</span>
    </a>
  );
}
