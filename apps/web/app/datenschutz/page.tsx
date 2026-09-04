import { PRIVACY_SHORT } from "@portfolio/legal";

export default function DatenschutzPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl">Datenschutzerklärung</h1>
      <h2 className="mt-6 font-serif text-xl">Verarbeitung von Depotdaten</h2>
      <p>{PRIVACY_SHORT}</p>
      <h2 className="mt-6 font-serif text-xl">Hosting</h2>
      <p>
        Diese Seite wird bei Vercel Inc. gehostet. Beim Aufruf werden technisch notwendige Verbindungsdaten (IP-Adresse,
        Zeitpunkt, aufgerufene Seite) durch den Hoster verarbeitet. [Platzhalter: Angaben zu Vercel Web Analytics, falls
        aktiviert]
      </p>
      <h2 className="mt-6 font-serif text-xl">Verantwortlicher</h2>
      <p>[Platzhalter: Name und Anschrift wie im Impressum]</p>
    </article>
  );
}
