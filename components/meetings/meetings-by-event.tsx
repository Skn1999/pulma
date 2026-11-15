import Link from "next/link";
import { AlertCircle, CalendarDays, ChevronDown, Clock, IdCard, MapPin, Video, Building2 } from "lucide-react";
import { eventDay } from "@/lib/events";
import { localSlotLabel } from "@/lib/promise-text";
import { needsAction, type EventMeetings, type MeetingRow } from "@/lib/meeting-groups";
import { MEET_MODE_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

type Role = "talent" | "company";

const hhmm = (local?: string) => (local ? local.slice(11, 16) : "");

/**
 * Meetings grouped by event: each event is one section with its date and venue, the person's arrival time
 * (candidate) or table (employer), a time-ordered event-day timeline, office and video meetings linked to that
 * event, and anything still needing a time. Past events fold away at the end. Used by both Meetings pages.
 */
export function MeetingsByEvent({ groups, role }: { groups: EventMeetings[]; role: Role }) {
  const upcoming = groups.filter((g) => !g.past);
  const past = groups.filter((g) => g.past);
  return (
    <div className="space-y-6">
      {upcoming.map((g) => (
        <EventSection key={g.event.id} g={g} role={role} />
      ))}
      {upcoming.length === 0 && past.length > 0 && (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No upcoming meetings.</p>
      )}
      {past.length > 0 && (
        <details className="group rounded-xl border border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            Past events ({past.length})
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-6 border-t p-4">
            {past.map((g) => (
              <EventSection key={g.event.id} g={g} role={role} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EventSection({ g, role }: { g: EventMeetings; role: Role }) {
  const count = g.eventDay.length + g.elsewhere.length + g.toArrange.length;
  const todo = needsAction(g);
  const headingId = `ev-${g.event.id}`;
  return (
    <section aria-labelledby={headingId} className={cn("overflow-hidden rounded-xl border border-border bg-card", g.past && "opacity-90")}>
      <header className="border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
        <h2 id={headingId} className="font-display text-lg font-semibold text-navy">{g.event.name}</h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {eventDay(g.event.date)} · {g.event.startTime}–{g.event.endTime}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {g.event.venue}
          </span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {role === "talent" && g.arrival && !g.past && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Clock className="size-3.5 text-primary" aria-hidden="true" /> Arrive at {hhmm(g.arrival)}
            </span>
          )}
          {role === "company" && g.table && (
            <span className="font-medium">Your table: {g.table}</span>
          )}
          <span className="text-muted-foreground">
            {count} {count === 1 ? "meeting" : "meetings"}
          </span>
          {todo > 0 && !g.past && (
            <span className="inline-flex items-center gap-1 font-medium text-warning">
              <AlertCircle className="size-3.5" aria-hidden="true" /> {todo} {role === "talent" ? (todo === 1 ? "needs" : "need") : "waiting for"} a time
            </span>
          )}
        </p>
      </header>

      <div className="divide-y divide-border">
        {g.eventDay.length > 0 && (
          <Block title="On the event day">
            <ol className="space-y-1">
              {g.eventDay.map((r) => (
                <Row key={r.meeting.id} r={r} role={role} when={`${hhmm(r.start)}–${hhmm(r.end)}`} where={r.table ? `Table ${r.table}` : undefined} />
              ))}
            </ol>
            {!g.past && (
              <Link href={`/event?event=${g.event.id}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                See the whole event day
              </Link>
            )}
          </Block>
        )}

        {g.elsewhere.length > 0 && (
          <Block title="Office and video">
            <ol className="space-y-1">
              {g.elsewhere.map((r) => (
                <Row
                  key={r.meeting.id}
                  r={r}
                  role={role}
                  when={r.start ? `${localSlotLabel(r.start)}–${hhmm(r.end)}` : ""}
                  where={MEET_MODE_LABEL[r.mode] + (r.meeting.place ? ` · ${r.meeting.place}` : "")}
                />
              ))}
            </ol>
          </Block>
        )}

        {g.toArrange.length > 0 && (
          <Block title={role === "talent" ? "Needs a time" : "Waiting for a time"}>
            <ol className="space-y-1">
              {g.toArrange.map((r) => (
                <Row
                  key={r.meeting.id}
                  r={r}
                  role={role}
                  when={
                    r.status === "booked"
                      ? "Time is set for you"
                      : role === "talent"
                        ? r.status === "reschedule" ? "They asked to move it" : "No time yet"
                        : r.status === "reschedule" ? "You asked to move it" : "They pick a time"
                  }
                  attention={r.status !== "booked"}
                />
              ))}
            </ol>
          </Block>
        )}

        {g.cancelled.length > 0 && (
          <Block title="Cancelled">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {g.cancelled.map((r) => (
                <li key={r.meeting.id}>
                  <Link href={`/talent/answers/${r.responseId}`} className="underline-offset-4 hover:underline">
                    {r.counterpart} · {r.cardTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Row({ r, role, when, where, attention }: { r: MeetingRow; role: Role; when: string; where?: string; attention?: boolean }) {
  const href = role === "talent" ? `/talent/answers/${r.responseId}` : `/company/card/${r.cardId}?r=${r.responseId}`;
  const ModeIcon = r.mode === "video" ? Video : r.mode === "office" ? Building2 : null;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 hover:bg-muted/60 sm:flex-nowrap">
      <span
        className={cn(
          "w-full shrink-0 text-sm tabular-nums sm:w-40",
          attention ? "inline-flex items-center gap-1 font-semibold text-warning" : "font-semibold text-navy",
        )}
      >
        {attention && <AlertCircle className="size-3.5" aria-hidden="true" />}
        {when}
      </span>
      <span className="min-w-0 flex-1">
        <Link href={href} className="font-medium outline-none underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          {r.counterpart}
          {role === "company" && <span className="font-normal text-muted-foreground"> · #{r.publicCode}</span>}
        </Link>
        <span className="block truncate text-sm text-muted-foreground">
          {where && (
            <>
              <span className="inline-flex items-center gap-1 align-[-2px]">
                {ModeIcon && <ModeIcon className="size-3.5" aria-hidden="true" />}
                {where}
              </span>
              {" · "}
            </>
          )}
          {r.cardTitle}
        </span>
      </span>
      {role === "talent" && attention ? (
        <Link href={href} className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring">
          {r.status === "reschedule" ? "Pick a new time" : "Pick a time"}
        </Link>
      ) : r.mode === "event" && r.table && r.status === "booked" ? (
        <Link
          href={`/meet/${r.meeting.id}`}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
        >
          <IdCard className="size-4" aria-hidden="true" /> Event card
        </Link>
      ) : null}
    </li>
  );
}
