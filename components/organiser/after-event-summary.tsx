import Link from "next/link";
import { shortDate } from "@/lib/next-steps";
import { nextStepsPlannedTotal, type FollowUpState } from "@/lib/outcomes";
import type { Event, OutcomeReport } from "@/lib/types";

/** Compact "After the event" figures for the most recent past event. Counts only. */
export function AfterEventSummary({ ev, state, report }: { ev: Event; state: Exclude<FollowUpState, "before">; report: OutcomeReport }) {
  const kept = report.promises;
  const items = [
    { label: "Hired", value: String(report.funnel.hired) },
    { label: "Next steps planned", value: String(nextStepsPlannedTotal(report)) },
    { label: "Reply promises kept", value: kept.replyKeptPct === null ? "Not enough data" : `${kept.replyKeptPct}%` },
    { label: "Next-step promises kept", value: kept.nextStepKeptPct === null ? "Not enough data" : `${kept.nextStepKeptPct}%` },
  ];
  return (
    <section aria-labelledby="after-heading" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="after-heading" className="font-display text-lg font-semibold">After the event</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {ev.name} · {state === "final" ? `Final · closed ${shortDate(ev.closedAt ?? report.asOf)}` : `Still settling · last updated ${shortDate(report.asOf)}`}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label}>
            <dt className="text-sm text-muted-foreground">{i.label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{i.value}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/organiser/events/${ev.id}?tab=outcomes`} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">
        See the full outcomes
      </Link>
    </section>
  );
}
