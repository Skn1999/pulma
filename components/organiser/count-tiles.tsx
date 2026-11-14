import type { Stats } from "@/lib/stats";

export function CountTiles({ counts }: { counts: Stats["counts"] }) {
  const responsesPerCard = counts.cards ? (counts.responses / counts.cards).toFixed(1) : "0";
  const items = [
    { label: "Problem cards", value: counts.cards, sub: "published by companies" },
    { label: "Responses", value: counts.responses, sub: `${responsesPerCard} per card on average` },
    { label: "Shortlisted", value: counts.shortlists, sub: "invites sent by companies" },
    { label: "Meetings", value: counts.meetings, sub: "accepted by talent" },
  ];
  return (
    <section aria-labelledby="counts-heading">
      <h2 id="counts-heading" className="sr-only">Totals</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <dt className="text-sm text-muted-foreground">{i.label}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{i.value}</dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{i.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
