import type { Transaction, TransactionType } from "@portfolio/csv";
import { cx } from "@portfolio/ui";
import { d, formatEur, formatNumber } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { TRANSACTION_TYPE_LABELS } from "@/lib/depotdoktor/labels";
import { Panel } from "./Panel";
import { ScrollRegion } from "./ScrollRegion";

const TYPE_TONE: Partial<Record<TransactionType, string>> = {
  buy: "border-navy-950/15 text-ink",
  sell: "border-gold/60 bg-gold-soft/60 text-gold-deep",
  dividend: "border-moss/30 bg-moss-soft/60 text-moss",
  interest: "border-moss/30 bg-moss-soft/60 text-moss",
  fee: "border-wine/25 bg-wine-soft/60 text-wine",
  tax: "border-wine/25 bg-wine-soft/60 text-wine",
};

export function TransactionsTab({ transactions }: { transactions: Transaction[] }) {
  return (
    <Panel
      title="Normalisierte Transaktionen"
      eyebrow="Buchungen"
      testId="transactions-tab"
      aside={<p className="text-xs text-slate">{transactions.length} Zeilen</p>}
    >
      <ScrollRegion label="Tabelle Transaktionen">
        <table className="data-table">
          <thead>
            <tr>
              <th className="pr-4">Datum</th>
              <th className="pr-4">Art</th>
              <th className="pr-8 text-right">Betrag</th>
              <th className="pr-4">Name</th>
              <th className="pr-4">ISIN</th>
              <th className="pr-4 text-right">Stück</th>
              <th className="pr-4 text-right">Kurs</th>
              <th className="pr-4 text-right">Gebühr</th>
              <th className="text-right">Steuer</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className={t.type === "other" ? "text-slate" : undefined}>
                <td className="num pr-4 whitespace-nowrap">{formatDateDe(t.date)}</td>
                <td className="pr-4">
                  <span
                    className={cx(
                      "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                      TYPE_TONE[t.type] ?? "border-line text-slate",
                    )}
                  >
                    {TRANSACTION_TYPE_LABELS[t.type]}
                  </span>
                </td>
                <td className="pr-8 text-right whitespace-nowrap">{formatEur(d(t.amount))}</td>
                <td className="pr-4">{t.name ?? "–"}</td>
                <td className="pr-4 font-mono text-xs text-slate">{t.isin ?? "–"}</td>
                <td className="pr-4 text-right">{t.shares ? formatNumber(d(t.shares)) : "–"}</td>
                <td className="pr-4 text-right whitespace-nowrap">{t.price ? formatEur(d(t.price)) : "–"}</td>
                <td className="pr-4 text-right whitespace-nowrap">{t.fee === "0" ? "–" : formatEur(d(t.fee))}</td>
                <td className="text-right whitespace-nowrap">{t.tax === "0" ? "–" : formatEur(d(t.tax))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </Panel>
  );
}
