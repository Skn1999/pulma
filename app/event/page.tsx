import { PageTitle } from "@/components/shell/page-title";
import { Timetable } from "@/components/event/timetable";
import { buildTimetable } from "@/components/event/build-timetable";
import { CompanyDay, TalentDay, EmptyDay, ScheduleNotice } from "@/components/event/my-day";
import { fmtDay, fmtTime } from "@/components/event/format";
import { loadDB } from "@/lib/store";
import { buildSchedule, tableOf } from "@/lib/schedule";
import { getAccount } from "@/lib/session";
import { nowMs } from "@/lib/clock";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eventLabel, eventsOfCompany, eventsOfTalent, helsinkiToday, pickEvent, sortedEvents, tablePlace, upcomingEvents } from "@/lib/events";
import { EventPicker } from "@/components/event/event-picker";

export const dynamic = "force-dynamic";

export default async function EventPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const asked = typeof sp.event === "string" ? sp.event : undefined;
  const account = await getAccount();
  const db = await loadDB();
  const now = nowMs();
  // Organisers see every event; companies and talent only the events they have problems or answers in.
  let choices = sortedEvents(db);
  if (account?.role === "company") choices = eventsOfCompany(db, account.companyId ?? "");
  else if (account?.role === "talent") choices = eventsOfTalent(db, account.talentId ?? "");
  // Draft events are the organiser's alone.
  if (account?.role !== "organiser") choices = choices.filter((e) => e.stage !== "draft");
  if (choices.length === 0) choices = upcomingEvents(db, now).filter((e) => account?.role === "organiser" || e.stage !== "draft").slice(0, 1);
  const ev = pickEvent(db, choices, asked, now) ?? sortedEvents(db)[0];
  const schedule = buildSchedule(db, ev.id);

  const meetingById = new Map(db.meetings.map((m) => [m.id, m]));
  const cardById = new Map(db.cards.map((c) => [c.id, c]));
  const responseById = new Map(db.responses.map((r) => [r.id, r]));
  const codeOf = (id: string) => responseById.get(id)?.publicCode ?? "?";

  // Per-meeting follow-up state, limited to what this side may see. The other side's
  // "not-now" is never exposed; the talent email only appears when both chose next-step.
  function followUpFor(meetingId: string, side: "company" | "talent") {
    const mine = db.feedback.find((f) => f.meetingId === meetingId && f.side === side)?.outcome ?? null;
    const other = db.feedback.find((f) => f.meetingId === meetingId && f.side !== side)?.outcome;
    const mutual = mine === "next-step" && other === "next-step";
    const talentId = responseById.get(meetingById.get(meetingId)?.responseId ?? "")?.talentId;
    return {
      meetingId,
      mine,
      mutual,
      ...(mutual && side === "company" ? { talentEmail: db.talents.find((t) => t.id === talentId)?.email } : {}),
    };
  }

  let title = "Event";
  let body: React.ReactNode;

  if (account?.role === "company") {
    title = "Event day";
    const companyId = account.companyId ?? "";
    const company = db.companies.find((c) => c.id === companyId);
    const table = tableOf(db, ev.id, companyId);
    const mine = schedule.slots.filter((s) => s.companyId === companyId);
    const unscheduled = schedule.unscheduled.filter((id) => {
      const m = meetingById.get(id);
      return m ? cardById.get(m.cardId)?.companyId === companyId : false;
    }).length;
    body = (
      <CompanyDay
        companyName={company?.name ?? "your company"}
        table={table ?? null}
        where={eventLabel(ev)}
        unscheduled={unscheduled}
        rows={mine.map((s) => ({
          meetingId: s.meetingId,
          time: fmtTime(s.start),
          responseCode: codeOf(s.responseId),
          followUp: followUpFor(s.meetingId, "company"),
          talentName: db.talents.find((t) => t.id === s.talentId)?.displayName ?? "Talent",
        }))}
      />
    );
  } else if (account?.role === "talent") {
    title = "My day";
    const talentId = account.talentId ?? "";
    const mine = schedule.slots.filter((s) => s.talentId === talentId);
    const unscheduled = schedule.unscheduled.filter((id) => {
      const m = meetingById.get(id);
      return m ? responseById.get(m.responseId)?.talentId === talentId : false;
    }).length;
    body = (
      <TalentDay
        arrival={schedule.arrivals[talentId] ?? null}
        unscheduled={unscheduled}
        rows={mine.map((s) => ({
          meetingId: s.meetingId,
          time: fmtTime(s.start),
          place: tablePlace(ev, s.table),
          companyName: db.companies.find((c) => c.id === s.companyId)?.name ?? "Company",
          problemTitle: cardById.get(s.cardId)?.title ?? "",
          responseCode: codeOf(s.responseId),
          followUp: followUpFor(s.meetingId, "talent"),
        }))}
      />
    );
  } else {
    title = "Schedule";
    const { columns, rows } = buildTimetable(db, schedule, ev);
    body =
      schedule.slots.length === 0 && schedule.unscheduled.length === 0 ? (
        <EmptyDay
          title="No meetings yet for this event"
          body="The timetable builds itself as talent accepts invites. Each table is one company; each row is a 10-minute slot."
        />
      ) : (
        <div className="space-y-4">
          {rows.length > 0 ? <Timetable columns={columns} rows={rows} /> : <p className="text-muted-foreground">No meeting has a placed slot yet.</p>}
          {schedule.unscheduled.length > 0 && <ScheduleNotice count={schedule.unscheduled.length} />}
        </div>
      );
  }

  const facts = [
    { k: "Date", v: fmtDay(ev.date) },
    { k: "Hours", v: `${ev.startTime}–${ev.endTime}` },
    { k: "Slots", v: `${ev.slotMinutes} min` },
    { k: "Tables", v: String(ev.tables) },
    { k: "Venue", v: ev.venue },
  ];

  const factsBlock = (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
      {facts.map((f) => (
        <div key={f.k}>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.k}</dt>
          <dd className="font-medium">{f.v}</dd>
        </div>
      ))}
    </dl>
  );

  // Candidates arrive here from one event on their Meetings page, so they get a way back rather than an event list.
  if (account?.role === "talent") {
    return (
      <>
        <PageTitle title={title} subtitle={ev.name} />
        <div className="space-y-6 px-4 py-6 sm:px-6">
          <Link href="/talent/meetings" className="-mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary">
            <ChevronLeft className="size-4" aria-hidden="true" /> Back to Meetings
          </Link>
          {factsBlock}
          {body}
        </div>
      </>
    );
  }

  // Employers and the event team: the list of events beside the day (above it on narrow screens).
  const hasList = choices.length > 1;
  return (
    <>
      <PageTitle title={title} subtitle={ev.name} />
      <div className={hasList ? "gap-6 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start" : "px-4 py-6 sm:px-6"}>
        <EventPicker
          events={choices}
          selectedId={ev.id}
          basePath="/event"
          title={account?.role === "company" ? "Your events" : "All events"}
          today={helsinkiToday(now)}
          className="mb-6 lg:sticky lg:top-4 lg:mb-0"
        />
        <div className="min-w-0 space-y-6">
          {factsBlock}
          {body}
        </div>
      </div>
    </>
  );
}
