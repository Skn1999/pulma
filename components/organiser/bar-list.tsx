export function BarList({
  id,
  title,
  items,
  unit,
}: {
  id: string;
  title: string;
  items: { name: string; count: number }[];
  unit: string; // singular, e.g. "problem"
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="text-2xl font-semibold">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Nothing published yet.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.name}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{i.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {i.count} {i.count === 1 ? unit : `${unit}s`}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1.5 h-2.5 w-full rounded-full bg-muted">
                <div className="h-2.5 rounded-full bg-primary" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
