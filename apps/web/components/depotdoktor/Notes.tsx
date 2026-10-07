export function Notes({ notes }: { notes: readonly string[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gold/40 bg-gold-soft/45 p-5 text-sm sm:p-7">
      <h2 className="eyebrow">Hinweise zur Berechnung</h2>
      <ul className="bullet-list mt-3 max-w-[66ch] leading-relaxed text-ink/85">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
