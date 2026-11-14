import Link from "next/link";

export const EVENT_TABS = [
  { key: "overview", label: "Overview" },
  { key: "employers", label: "Employers" },
  { key: "problems", label: "Problems" },
  { key: "schedule", label: "Schedule" },
] as const;
export type EventTab = (typeof EVENT_TABS)[number]["key"];

/** Tabs as real links (`?tab=`), so they work without scripts and with the keyboard. */
export function EventTabs({ eventId, current }: { eventId: string; current: EventTab }) {
  return (
    <nav aria-label="Event sections" className="flex flex-wrap gap-2 border-b pb-3">
      {EVENT_TABS.map((t) => {
        const on = t.key === current;
        return (
          <Link
            key={t.key}
            href={`/organiser/events/${eventId}?tab=${t.key}`}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
