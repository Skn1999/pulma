import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Event } from "@/lib/types";
import { eventDay } from "@/lib/events";
import { cn } from "@/lib/utils";

/**
 * A titled list of events, grouped by upcoming and past, with each category in chronological order.
 * Past events fold into a category section. Server component; the chosen event is in `?event=`.
 * The current one is marked by a filled dot, a left rule and aria-current, not by colour alone.
 */
export function EventPicker({
  events, selectedId, basePath, title = "Events", today, className,
}: {
  events: Event[];
  selectedId: string;
  basePath: string;
  title?: string;
  today?: string; // "YYYY-MM-DD" (Helsinki): marks earlier events as past
  className?: string;
}) {
  if (events.length < 2) return null;

  const isPast = (e: Event) => e.stage === "done" || (!!today && e.date < today);
  const byDate = (a: Event, b: Event) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id));

  const sorted = [...events].sort(byDate);
  const upcoming = sorted.filter((e) => !isPast(e));
  const past = sorted.filter((e) => isPast(e));

  const renderItem = (e: Event, pastItem: boolean) => {
    const on = e.id === selectedId;
    return (
      <li key={e.id}>
        <Link
          href={`${basePath}?event=${e.id}`}
          aria-current={on ? "page" : undefined}
          className={cn(
            "flex min-h-14 items-start gap-3 border-l-[3px] px-4 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50",
            on ? "border-primary bg-accent" : "border-transparent hover:bg-muted",
          )}
        >
          <span
            aria-hidden="true"
            className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", on ? "bg-primary" : "border-2 border-border")}
          />
          <span className="min-w-0 flex-1">
            <span className={cn("block", on ? "font-semibold text-navy" : "font-medium")}>{e.name}</span>
            <span className="block truncate text-muted-foreground">
              {eventDay(e.date)} · {e.venue}
            </span>
          </span>
          {pastItem && (
            <span className="mt-0.5 shrink-0 rounded-full border border-border px-2 text-xs text-muted-foreground">
              Past
            </span>
          )}
        </Link>
      </li>
    );
  };

  const hasBoth = upcoming.length > 0 && past.length > 0;
  const isPastSelected = past.some((e) => e.id === selectedId);

  return (
    <nav aria-labelledby="event-picker-h" className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <h2 id="event-picker-h" className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>

      {upcoming.length > 0 && (
        <div>
          {hasBoth && (
            <div className="border-b border-border bg-muted/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Upcoming
            </div>
          )}
          <ul className="divide-y divide-border">
            {upcoming.map((e) => renderItem(e, false))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <details
          open={past.length <= 3 || isPastSelected || upcoming.length === 0}
          className={cn("group", upcoming.length > 0 && "border-t border-border")}
        >
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <span>Past events ({past.length})</span>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="divide-y divide-border">
            {past.map((e) => renderItem(e, true))}
          </ul>
        </details>
      )}
    </nav>
  );
}
