import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { EventNav, type EventView } from "@/components/event/event-nav";
import { Timetable } from "@/components/event/timetable";
import { buildTimetable } from "@/components/event/build-timetable";
import { CompanyDay, TalentDay, ScheduleNotice } from "@/components/event/my-day";
import { fmtDay, fmtTime } from "@/components/event/format";
import { getDB } from "@/lib/store";
import { buildSchedule } from "@/lib/schedule";
import { getCompanyId, getTalentId } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; talent?: string }>;
}) {
  const sp = await searchParams;
  const view: EventView = sp.company === "me" ? "company" : sp.talent === "me" ? "talent" : "full";

  const db = getDB();
  const schedule = buildSchedule(db);
  const ev = db.event;
  const subtitle = `${fmtDay(ev.date)}, ${ev.startTime}–${ev.endTime}. ${ev.slotMinutes}-minute conversations at ${ev.tables} tables.`;

  const meetingById = new Map(db.meetings.map((m) => [m.id, m]));
  const cardById = new Map(db.cards.map((c) => [c.id, c]));
  const responseById = new Map(db.responses.map((r) => [r.id, r]));
  const codeOf = (responseId: string) => responseById.get(responseId)?.publicCode ?? "?";

  const noMeetings = db.meetings.length === 0;

  let body: ReactNode;

  if (noMeetings) {
    body = (
      <p className="rounded-xl border border-dashed border-border bg-paper p-8 text-center text-muted-foreground">
        No meetings yet — they appear here when talent accepts an invite.
      </p>
    );
  } else if (view === "full") {
    const { columns, rows } = buildTimetable(db, schedule);
    body = (
      <div className="space-y-4">
        {rows.length > 0 ? (
          <Timetable columns={columns} rows={rows} />
        ) : (
          <p className="text-muted-foreground">No meeting has a placed slot yet.</p>
        )}
        {schedule.unscheduled.length > 0 && <ScheduleNotice count={schedule.unscheduled.length} />}
      </div>
    );
  } else if (view === "company") {
    const companyId = await getCompanyId();
    const company = db.companies.find((c) => c.id === companyId);
    const mine = schedule.slots.filter((s) => s.companyId === companyId);
    const unscheduled = schedule.unscheduled.filter((id) => {
      const m = meetingById.get(id);
      return m ? cardById.get(m.cardId)?.companyId === companyId : false;
    }).length;
    body = (
      <CompanyDay
        companyName={company?.name ?? "your company"}
        unscheduled={unscheduled}
        rows={mine.map((s) => ({
          time: fmtTime(s.start),
          table: s.table,
          responseCode: codeOf(s.responseId),
          talentName: db.talents.find((t) => t.id === s.talentId)?.displayName ?? "Talent",
        }))}
      />
    );
  } else {
    const talentId = await getTalentId();
    const mine = schedule.slots.filter((s) => s.talentId === talentId);
    const arrival = schedule.arrivals[talentId] ?? null;
    const unscheduled = schedule.unscheduled.filter((id) => {
      const m = meetingById.get(id);
      return m ? responseById.get(m.responseId)?.talentId === talentId : false;
    }).length;
    body = (
      <TalentDay
        arrival={arrival}
        unscheduled={unscheduled}
        rows={mine.map((s) => ({
          time: fmtTime(s.start),
          table: s.table,
          companyName: db.companies.find((c) => c.id === s.companyId)?.name ?? "Company",
          responseCode: codeOf(s.responseId),
        }))}
      />
    );
  }

  return (
    <>
      <PageHeader title={ev.name} subtitle={subtitle} />
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 sm:px-6">
        <EventNav active={view} />
        {body}
      </div>
    </>
  );
}
