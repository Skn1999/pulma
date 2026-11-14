import Link from "next/link";
import type { Event } from "@/lib/types";
import { eventDay } from "@/lib/events";

/** A row of links, one per event. Server component; the chosen event is in `?event=`. */
export function EventPicker({ events, selectedId, basePath }: { events: Event[]; selectedId: string; basePath: string }) {
  if (events.length < 2) return null;
  return (
    <nav aria-label="Choose an event" className="flex flex-wrap gap-2">
      {events.map((e) => {
        const on = e.id === selectedId;
        return (
          <Link
            key={e.id}
            href={`${basePath}?event=${e.id}`}
            aria-current={on ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
            }`}
          >
            {on && <span aria-hidden="true">✓</span>}
            <span className="font-medium">{e.name}</span>
            <span className={on ? "" : "text-muted-foreground"}>· {eventDay(e.date)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
