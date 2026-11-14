import Link from "next/link";
import { PageTitle } from "@/components/shell/page-title";
import { NewEventForm } from "@/components/organiser/new-event-form";
import { fmtDay } from "@/components/event/format";
import { getDB } from "@/lib/store";
import { eventDay, eventOf, sortedEvents } from "@/lib/events";
import { meetingMode } from "@/lib/slots";
import { eventStage } from "@/lib/participation";
import { StageBadge } from "@/components/events/stage-badge";
import { nowMs } from "@/lib/clock";

export const dynamic = "force-dynamic";

export default function OrganiserEventsPage() {
  const db = getDB();
  const now = nowMs();
  const rows = sortedEvents(db).map((ev) => {
    const cards = db.cards.filter((c) => c.status === "published" && eventOf(db, c).id === ev.id);
    const ids = new Set(cards.map((c) => c.id));
    const meetings = db.meetings.filter((m) => ids.has(m.cardId) && meetingMode(m) === "event");
    const confirmed = db.participations.filter((p) => p.eventId === ev.id && p.status === "confirmed").length;
    const invited = db.participations.filter((p) => p.eventId === ev.id && p.status === "invited").length;
    return { ev, stage: eventStage(ev, now), problems: cards.length, meetings: meetings.length, confirmed, invited };
  });

  return (
    <>
      <PageTitle title="Events" subtitle="You invite companies; each accepted company publishes up to 3 problems for the event." />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <section aria-labelledby="events-list-h" className="space-y-3">
          <h2 id="events-list-h" className="sr-only">All events</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {rows.map(({ ev, stage, problems, meetings, confirmed, invited }) => (
              <li key={ev.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    <Link href={`/organiser/events/${ev.id}`} className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">{ev.name}</Link>
                  </h3>
                  <StageBadge stage={stage} />
                </div>
                <p className="text-sm text-muted-foreground">{fmtDay(ev.date)} · {ev.startTime}–{ev.endTime}</p>
                <p className="mt-1 text-sm">{ev.venue}</p>
                {ev.focus && <p className="text-sm text-muted-foreground">{ev.focus}</p>}
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div><dt className="inline text-muted-foreground">Tables </dt><dd className="inline font-medium tabular-nums">{confirmed} of {ev.tables} taken{invited > 0 ? `, ${invited} invited` : ""}</dd></div>
                  <div><dt className="inline text-muted-foreground">Problem deadline </dt><dd className="inline font-medium">{eventDay(ev.problemDeadline)}</dd></div>
                  <div><dt className="inline text-muted-foreground">Problems </dt><dd className="inline font-medium tabular-nums">{problems}</dd></div>
                  <div><dt className="inline text-muted-foreground">Meetings </dt><dd className="inline font-medium tabular-nums">{meetings}</dd></div>
                </dl>
                <p className="mt-3 flex flex-wrap gap-4 text-sm">
                  <Link href={`/organiser/events/${ev.id}`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Manage</Link>
                  <Link href={`/organiser?event=${ev.id}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Overview</Link>
                  <Link href={`/event?event=${ev.id}`} className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Schedule</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <NewEventForm />
      </div>
    </>
  );
}
