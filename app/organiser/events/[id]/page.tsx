import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/shell/page-title";
import { StageBadge } from "@/components/events/stage-badge";
import { EventTabs, EVENT_TABS, type EventTab } from "@/components/organiser/event-tabs";
import { EventSettings, StageActions, type StageAction } from "@/components/organiser/stage-panel";
import { EmployersPanel, type EmployerRow } from "@/components/organiser/employers-panel";
import { CountTiles } from "@/components/organiser/count-tiles";
import { NeedsTimeline } from "@/components/organiser/needs-timeline";
import { fmtDay } from "@/components/event/format";
import { buttonVariants } from "@/components/ui/button";
import { getDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { OutcomesPanel } from "@/components/organiser/outcomes-panel";
import { eventOutcomes, followUpState } from "@/lib/outcomes";
import { getStats } from "@/lib/stats";
import { eventById, eventDay, eventOf } from "@/lib/events";
import { canMoveStage, eventStage, hasBookedMeetings, seatsLeft } from "@/lib/participation";
import { eventActivityText } from "@/lib/activity";
import { requireAccount } from "@/lib/session";
import { cardState } from "@/lib/deadlines";
import type { Event, EventStage } from "@/lib/types";

export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Helsinki" });

function actionsFor(stage: EventStage, ev: Event, now: number): StageAction[] {
  const out: StageAction[] = [];
  if (canMoveStage(stage, "open", ev, now) && stage === "draft") {
    out.push({ to: "open", label: "Open the event", primary: true, explain: "Invited companies can publish problems and candidates can see them." });
  }
  if (stage === "open") {
    out.push({ to: "locked", label: "Lock the event", primary: true, explain: "No new problems, answers, invitations or table changes. The schedule becomes final. Usually done the day before." });
  }
  if (stage === "locked") {
    out.push({ to: "done", label: "Mark as done", primary: true, explain: "The event is over. It stays visible in the lists as done." });
    out.push({ to: "open", label: "Unlock", explain: "Go back to open: companies and candidates can make changes again." });
  }
  return out;
}

export default async function OrganiserEventPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAccount("organiser");
  const { id } = await params;
  const sp = await searchParams;
  const db = getDB();
  const ev = eventById(db, id);
  if (!ev) notFound();
  const now = nowMs();
  const stage = eventStage(ev, now);
  const asked = typeof sp.tab === "string" ? sp.tab : "overview";
  const tab: EventTab = EVENT_TABS.some((t) => t.key === asked) ? (asked as EventTab) : "overview";
  const frozen = stage === "locked" || stage === "done";
  const cards = db.cards.filter((c) => c.status === "published" && eventOf(db, c).id === ev.id);

  let body: React.ReactNode;
  if (tab === "overview") {
    const stats = getStats(db, ev.id);
    body = (
      <div className="space-y-6">
        <section aria-labelledby="stage-h" className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="stage-h" className="font-display text-lg font-semibold">Stage</h2>
            <StageBadge stage={stage} />
          </div>
          {ev.stage !== stage && <p className="text-sm text-muted-foreground">The date has passed, so this event now counts as done.</p>}
          <StageActions eventId={ev.id} actions={ev.stage === stage ? actionsFor(stage, ev, now) : []} />
        </section>
        <section aria-labelledby="settings-h" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 id="settings-h" className="mb-4 font-display text-lg font-semibold">Deadline and description</h2>
          <EventSettings eventId={ev.id} date={ev.date} deadline={ev.problemDeadline} description={ev.description ?? ""} readOnly={stage === "done"} />
        </section>
        <CountTiles counts={stats.counts} />
        <NeedsTimeline timeline={stats.timeline} eventDate={ev.date} />
      </div>
    );
  } else if (tab === "employers") {
    const rows: EmployerRow[] = db.participations
      .filter((p) => p.eventId === ev.id)
      .map((p) => {
        const co = db.companies.find((c) => c.id === p.companyId);
        return {
          id: p.id,
          name: co?.name ?? p.companyId,
          sector: co?.sector ?? "",
          status: p.status,
          table: p.table,
          invitedOn: dayFmt.format(new Date(p.invitedAt)),
          note: p.note,
          blockedReason: p.status === "confirmed" && hasBookedMeetings(db, ev.id, p.companyId) ? "Has booked meetings" : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const invitable = db.companies
      .filter((c) => !db.participations.some((p) => p.eventId === ev.id && p.companyId === c.id && (p.status === "invited" || p.status === "confirmed")))
      .map((c) => ({ id: c.id, name: c.name, sector: c.sector }));
    const recent = db.activity
      .filter((a) => a.eventId === ev.id)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .map((a) => ({ id: a.id, at: a.at, text: eventActivityText(db, a) }))
      .filter((a): a is { id: string; at: string; text: string } => !!a.text)
      .slice(0, 8);
    body = (
      <div className="space-y-6">
        <EmployersPanel eventId={ev.id} rows={rows} tables={ev.tables} frozen={frozen} invitable={invitable} seatsLeft={seatsLeft(db, ev.id)} />
        {recent.length > 0 && (
          <section aria-labelledby="recent-h" className="space-y-2">
            <h2 id="recent-h" className="font-display text-base font-semibold">Recent replies</h2>
            <ul className="space-y-1 text-sm">
              {recent.map((a) => (
                <li key={a.id}>
                  {a.text} <span className="text-muted-foreground">· {dayFmt.format(new Date(a.at))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  } else if (tab === "problems") {
    const rows = cards
      .map((c) => ({
        card: c,
        company: db.companies.find((co) => co.id === c.companyId)?.name ?? "",
        answers: db.responses.filter((r) => r.cardId === c.id).length,
        state: cardState(c),
      }))
      .sort((a, b) => (a.card.createdAt < b.card.createdAt ? -1 : 1));
    body =
      rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-display text-lg font-semibold">No problems yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Problems appear here when confirmed companies publish them.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Problems for this event</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Problem</th>
                <th scope="col" className="px-3 py-2 font-medium">Company</th>
                <th scope="col" className="px-3 py-2 font-medium">Published</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Answers</th>
                <th scope="col" className="px-4 py-2 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ card, company, answers, state }) => (
                <tr key={card.id} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-display text-base font-medium">{card.title}</th>
                  <td className="px-3 py-3">{company}</td>
                  <td className="px-3 py-3 text-muted-foreground">{dayFmt.format(new Date(card.createdAt))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{answers}</td>
                  <td className="px-4 py-3">{state === "open" ? "Open" : state === "paused" ? "Paused" : "Filled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  } else if (tab === "outcomes") {
    const fu = followUpState(ev, now);
    body =
      fu === "before" ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-display text-lg font-semibold">Outcomes appear after the event</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">From {eventDay(ev.date)}, this tab shows what happened next: meetings held, next steps and hires, as counts only.</p>
        </div>
      ) : (
        <OutcomesPanel ev={ev} state={fu} report={fu === "final" && ev.report ? ev.report : eventOutcomes(db, ev.id, now)} />
      );
  } else {
    body = (
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-display text-lg font-semibold">Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">The timetable for {ev.name}: one column per table, 10-minute slots.</p>
        <Link href={`/event?event=${ev.id}`} className={`${buttonVariants()} mt-3`}>Open the schedule</Link>
      </div>
    );
  }

  return (
    <>
      <PageTitle
        title={ev.name}
        subtitle={`${fmtDay(ev.date)} · ${ev.startTime}–${ev.endTime} · ${ev.venue}`}
        actions={<StageBadge stage={stage} />}
      />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <Link href="/organiser/events" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">All events</Link>
        <p className="text-sm text-muted-foreground">Problem deadline {eventDay(ev.problemDeadline)}.</p>
        <EventTabs eventId={ev.id} current={tab} />
        {body}
      </div>
    </>
  );
}
