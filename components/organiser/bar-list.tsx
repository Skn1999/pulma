export function BarList({
  id, title, items, unit,
}: {
  id: string;
  title: string;
  items: { name: string; count: number }[];
  unit: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section aria-labelledby={id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id={id} className="font-display text-base font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((i) => (
            <li key={i.name}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{i.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {i.count} {i.count === 1 ? unit : `${unit}s`}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
