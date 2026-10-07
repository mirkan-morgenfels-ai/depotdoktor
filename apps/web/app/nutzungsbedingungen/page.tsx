import type { Metadata } from "next";
import { OPERATOR } from "@portfolio/legal";
import { ExternalLink, LegalPage, LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/metadata";
import { LICENSE_URL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Nutzungsbedingungen",
  description:
    "Nutzungsbedingungen von DepotDoktor: kostenlose Nutzung, keine Anlage- oder Steuerberatung, Schätzungen ohne Gewähr.",
  path: "/nutzungsbedingungen",
});

export default function NutzungsbedingungenPage() {
  return (
    <LegalPage title="Nutzungsbedingungen" updated={OPERATOR.lastUpdated}>
      <LegalSection title="1. Geltungsbereich">
        <p>
          Diese Nutzungsbedingungen gelten für die Nutzung der auf dieser Seite bereitgestellten Werkzeuge, insbesondere
          DepotDoktor, sowie der zugehörigen Texte und Beispiele. Betreiber ist {OPERATOR.name} (siehe Impressum). Mit der
          Nutzung erkennen Sie diese Bedingungen an. Die Nutzung ist kostenlos; ein Vertrag über eine entgeltliche Leistung
          kommt nicht zustande.
        </p>
      </LegalSection>

      <LegalSection title="2. Zweck der Werkzeuge">
        <p>
          Die Werkzeuge sind private Portfolio- und Lernprojekte. Sie berechnen aus Daten, die Sie selbst bereitstellen,
          Kennzahlen und Schätzungen zu Informationszwecken. Sie ersetzen weder die Abrechnung Ihrer Bank noch die Beratung
          durch Steuerberater, Rechtsanwälte oder zugelassene Anlageberater.
        </p>
      </LegalSection>

      <LegalSection title="3. Keine Beratung, kein Angebot">
        <p>
          Sämtliche Inhalte, Berechnungen, Kennzahlen, Steuerschätzungen, Texte und Beispiele stellen keine Anlage-, Steuer-
          oder Rechtsberatung dar. Sie sind kein Angebot, keine Empfehlung und keine Aufforderung zum Kauf, Verkauf oder
          Halten von Finanzinstrumenten und keine Aufforderung zu einer bestimmten steuerlichen Gestaltung. Es handelt sich um
          allgemeine, öffentlich zugängliche Informationen ohne Prüfung Ihrer persönlichen Verhältnisse. Entscheidungen, die
          Sie auf Grundlage dieser Inhalte treffen, treffen Sie eigenverantwortlich.
        </p>
      </LegalSection>

      <LegalSection title="4. Keine Gewähr für Ergebnisse">
        <p>
          Für Richtigkeit, Vollständigkeit und Aktualität der Berechnungen wird keine Gewähr übernommen. Steuerliche
          Ergebnisse sind Schätzungen auf Basis vereinfachter Annahmen (unter anderem ohne Sparerpauschbetrag, Kirchensteuer
          und Verlustverrechnung); maßgeblich ist allein die Abrechnung Ihrer depotführenden Bank und die Festsetzung durch
          das Finanzamt. Die unterstützten Datenformate der Broker können sich jederzeit ändern; die Werkzeuge können dann
          fehlerhafte oder keine Ergebnisse liefern. Die Werkzeuge werden ohne Zusicherung einer bestimmten Verfügbarkeit
          bereitgestellt und können jederzeit geändert oder eingestellt werden.
        </p>
      </LegalSection>

      <LegalSection title="5. Haftung">
        <p>
          Der Betreiber haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie
          für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Im Übrigen ist die Haftung ausgeschlossen. Da die
          Nutzung unentgeltlich erfolgt, haftet der Betreiber für sonstige Schäden nur, soweit er einen Mangel arglistig
          verschwiegen hat (§§ 521, 599 BGB entsprechend). Insbesondere wird nicht gehaftet für Vermögensschäden, entgangenen
          Gewinn, Steuernachzahlungen, Zinsen oder Säumniszuschläge, die aus der Verwendung der Berechnungen entstehen.
        </p>
      </LegalSection>

      <LegalSection title="6. Ihre Daten">
        <p>
          Von Ihnen ausgewählte Dateien werden ausschließlich in Ihrem Browser verarbeitet und nicht an den Betreiber
          übertragen. Sie sind selbst dafür verantwortlich, dass Sie zur Nutzung der Daten berechtigt sind. Einzelheiten
          stehen in der Datenschutzerklärung.
        </p>
      </LegalSection>

      <LegalSection title="7. Quellcode und Lizenz">
        <p>
          Der Quellcode ist öffentlich unter{" "}
          <ExternalLink href={REPO_URL}>github.com/mirkan-morgenfels-ai/depotdoktor</ExternalLink> verfügbar (
          <ExternalLink href={LICENSE_URL}>MIT-Lizenz</ExternalLink>). Die Lizenz enthält einen eigenen Haftungs- und
          Gewährleistungsausschluss, der für die Nutzung des Quellcodes gilt.
        </p>
      </LegalSection>

      <LegalSection title="8. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Sollten einzelne Bestimmungen unwirksam sein, bleibt die
          Wirksamkeit der übrigen Bestimmungen unberührt. Der Betreiber kann diese Bedingungen mit Wirkung für die Zukunft
          ändern; es gilt die jeweils hier veröffentlichte Fassung.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
