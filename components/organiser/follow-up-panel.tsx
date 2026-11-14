import type { Stats } from "@/lib/stats";

export function FollowUpPanel({ followUps }: { followUps: Stats["followUps"] }) {
  const items = [
    { label: "Meetings held", value: followUps.meetings },
    { label: "Follow-ups answered", value: followUps.answered },
    { label: "Mutual next steps", value: followUps.mutualNextSteps },
  ];
  return (
    <section aria-labelledby="followups-heading" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="followups-heading" className="font-display text-lg font-semibold">After the conversations</h2>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-sm text-muted-foreground">{i.label}</dt>
            <dd className="font-display text-3xl font-semibold tabular-nums">{i.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Only totals are shown. Individual answers stay private.</p>
    </section>
  );
}
