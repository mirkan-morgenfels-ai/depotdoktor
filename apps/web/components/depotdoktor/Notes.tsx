export function Notes({ notes }: { notes: readonly string[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-lg border border-line bg-surface p-6 text-sm">
      <h2 className="mb-3 font-serif text-lg">Hinweise zur Berechnung</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
