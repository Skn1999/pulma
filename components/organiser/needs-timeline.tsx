import type { Stats } from "@/lib/stats";
import { fmtShortDate } from "@/components/event/format";

type Timeline = Stats["timeline"];

/**
 * Horizontal timeline: earliest problem card on the left, event day on the right.
 * The graphic is decorative (aria-hidden); the list below carries the same information for everyone.
 */
export function NeedsTimeline({ timeline, eventDate }: { timeline: Timeline; eventDate: string }) {
  if (timeline.length === 0) {
    return (
      <section aria-labelledby="timeline-heading" className="space-y-3">
        <h2 id="timeline-heading" className="text-2xl font-semibold">
          When needs arrived
        </h2>
        <p className="text-muted-foreground">No problem cards have been published yet.</p>
      </section>
    );
  }

  const avg = Math.round(timeline.reduce((sum, t) => sum + t.daysBeforeEvent, 0) / timeline.length);
  const maxDays = Math.max(1, ...timeline.map((t) => t.daysBeforeEvent));
  const earliestDate = timeline[0].createdAt;

  const dots = timeline.map((t) => {
    const clamped = Math.min(Math.max(t.daysBeforeEvent, 0), maxDays);
    return { ...t, left: (1 - clamped / maxDays) * 100 };
  });

  return (
    <section aria-labelledby="timeline-heading" className="space-y-6">
      <div>
        <h2 id="timeline-heading" className="text-2xl font-semibold">
          When needs arrived
        </h2>
        <p className="mt-2 text-lg">
          Problems arrived on average{" "}
          <strong className="font-display text-2xl tabular-nums">{avg}</strong> days before the event.
        </p>
        <p className="text-sm text-muted-foreground">Typical: the day before.</p>
      </div>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div aria-hidden="true" className="relative h-16">
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
          {dots.map((d) => (
            <span
              key={d.cardId}
              title={`${d.title}: ${d.daysBeforeEvent} days before the event`}
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-paper"
              style={{ left: `${d.left}%` }}
            />
          ))}
          <div className="absolute right-0 top-0 h-full w-0.5 bg-primary" />
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
          <span>First card: {fmtShortDate(earliestDate)}</span>
          <span className="font-medium text-primary">Event day: {fmtShortDate(eventDate)}</span>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold">Cards in order of arrival</h3>
        <ol className="mt-3 divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {timeline.map((t) => (
            <li key={t.cardId} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{t.title}</span>
              <span className="text-muted-foreground">
                arrived {fmtShortDate(t.createdAt)}, {t.daysBeforeEvent}{" "}
                {t.daysBeforeEvent === 1 ? "day" : "days"} before the event
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
