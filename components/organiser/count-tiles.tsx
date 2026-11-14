import type { Stats } from "@/lib/stats";

export function CountTiles({ counts }: { counts: Stats["counts"] }) {
  const items = [
    { label: "Problem cards", value: counts.cards },
    { label: "Responses", value: counts.responses },
    { label: "Shortlisted", value: counts.shortlists },
    { label: "Meetings", value: counts.meetings },
  ];
  return (
    <section aria-labelledby="counts-heading">
      <h2 id="counts-heading" className="sr-only">
        Totals
      </h2>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <dt className="text-sm text-muted-foreground">{i.label}</dt>
            <dd className="mt-2 font-display text-4xl font-semibold tabular-nums">{i.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
