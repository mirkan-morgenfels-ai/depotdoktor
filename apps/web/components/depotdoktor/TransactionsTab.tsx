import type { Transaction, TransactionType } from "@portfolio/csv";
import { d, formatEur, formatNumber } from "@/lib/depotdoktor/money";
import { formatDateDe } from "@/lib/depotdoktor/dates";
import { ScrollRegion } from "./ScrollRegion";

const TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Kauf",
  sell: "Verkauf",
  dividend: "Dividende",
  interest: "Zinsen",
  fee: "Gebühr",
  tax: "Steuer",
  deposit: "Einzahlung",
  withdrawal: "Auszahlung",
  other: "Sonstiges",
};

export function TransactionsTab({ transactions }: { transactions: Transaction[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6" data-testid="transactions-tab">
      <h2 className="mb-4 font-serif text-xl">Normalisierte Transaktionen</h2>
      <ScrollRegion label="Tabelle Transaktionen">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 pr-4">Datum</th>
              <th className="py-2 pr-4">Art</th>
              <th className="py-2 pr-4 text-right">Betrag</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">ISIN</th>
              <th className="py-2 pr-4 text-right">Stück</th>
              <th className="py-2 pr-4 text-right">Kurs</th>
              <th className="py-2 pr-4 text-right">Gebühr</th>
              <th className="py-2 text-right">Steuer</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className={t.type === "other" ? "border-t border-line text-muted" : "border-t border-line"}>
                <td className="py-2 pr-4 whitespace-nowrap">{formatDateDe(t.date)}</td>
                <td className="py-2 pr-4">{TYPE_LABELS[t.type]}</td>
                <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{formatEur(d(t.amount))}</td>
                <td className="py-2 pr-4">{t.name ?? "–"}</td>
                <td className="py-2 pr-4 font-mono text-xs">{t.isin ?? "–"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{t.shares ? formatNumber(d(t.shares)) : "–"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{t.price ? formatEur(d(t.price)) : "–"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{t.fee === "0" ? "–" : formatEur(d(t.fee))}</td>
                <td className="py-2 text-right tabular-nums">{t.tax === "0" ? "–" : formatEur(d(t.tax))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}
