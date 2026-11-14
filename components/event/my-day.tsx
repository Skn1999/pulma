import { Fragment } from "react";
import Link from "next/link";
import { CalendarClock, IdCard } from "lucide-react";
import { FollowUp, type FollowUpState } from "./follow-up";

export function ScheduleNotice({ count }: { count: number }) {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">
      {count} accepted {count === 1 ? "meeting" : "meetings"} could not be placed on the timetable yet (no free
      slot). {count === 1 ? "It is" : "They are"} still booked and the organisers will follow up.
    </p>
  );
}

export function EmptyDay({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <CalendarClock aria-hidden="true" className="size-8 text-muted-foreground" />
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export interface CompanyDayRow {
  meetingId: string;
  followUp: FollowUpState;
  time: string;
  responseCode: string;
  talentName: string;
}

export function CompanyDay({
  companyName,
  table,
  where,
  rows,
  unscheduled,
}: {
  companyName: string;
  table: number | null;
  where: string;
  rows: CompanyDayRow[];
  unscheduled: number;
}) {
  return (
    <section aria-labelledby="company-day" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="company-day" className="font-display text-xl font-semibold">
          Your event day, {companyName}
        </h2>
        <p className="w-full text-sm text-muted-foreground">{where}</p>
        {table !== null && (
          <p className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
            Your table: <span className="font-display text-lg tabular-nums">{table}</span>
          </p>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyDay
          title="No meetings yet"
          body="Meetings appear here when someone you shortlisted accepts your invite. Their name is revealed then, and only then."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Your meetings in time order</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Response</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Talent (accepted)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.time}>
                  <tr>
                    <th scope="row" className="px-4 pt-3 font-display text-base font-semibold tabular-nums">{r.time}</th>
                    <td className="px-4 pt-3">Response #{r.responseCode}</td>
                    <td className="px-4 pt-3 font-medium">{r.talentName}</td>
                  </tr>
                  <tr className="border-b border-border last:border-0">
                    <td colSpan={3} className="px-4 pb-3">
                      <Link href={`/meet/${r.meetingId}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring">
                        <IdCard className="size-4" aria-hidden="true" /> Event card
                      </Link>
                      <FollowUp side="company" state={r.followUp} />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unscheduled > 0 && <ScheduleNotice count={unscheduled} />}
    </section>
  );
}

export interface TalentDayRow {
  meetingId: string;
  followUp: FollowUpState;
  time: string;
  place: string;
  companyName: string;
  problemTitle: string;
  responseCode: string;
}

export function TalentDay({
  arrival,
  rows,
  unscheduled,
}: {
  arrival: string | null;
  rows: TalentDayRow[];
  unscheduled: number;
}) {
  return (
    <section aria-labelledby="talent-day" className="space-y-5">
      <h2 id="talent-day" className="sr-only">My day</h2>
      {rows.length === 0 ? (
        <EmptyDay
          title="Nothing booked yet"
          body="Meetings appear here when you accept an invite. Your arrival time is worked out from your first meeting."
        />
      ) : (
        <>
          {arrival && (
            <div className="rounded-xl border border-primary/30 bg-accent p-5 text-accent-foreground">
              <p className="text-sm font-medium">
                Arrive <time dateTime={arrival} className="font-display text-3xl font-semibold tabular-nums">{arrival.slice(11, 16)}</time>
              </p>
              <p className="mt-1 text-sm">Staggered so nobody queues.</p>
            </div>
          )}
          <ol className="relative ml-2 space-y-4 border-l-2 border-border pl-6">
            {rows.map((r) => (
              <li key={r.time} className="relative rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <span aria-hidden="true" className="absolute -left-[1.95rem] top-5 size-3 rounded-full border-2 border-primary bg-background" />
                <p className="font-display text-xl font-semibold tabular-nums">{r.time}</p>
                <p className="mt-1 font-medium">{r.companyName}</p>
                <p className="text-sm">{r.place}</p>
                <p className="text-sm text-muted-foreground">{r.problemTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">Your answer: Response #{r.responseCode}</p>
                <Link href={`/meet/${r.meetingId}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring">
                  <IdCard className="size-4" aria-hidden="true" /> Your event card
                </Link>
                <FollowUp side="talent" companyName={r.companyName} state={r.followUp} />
              </li>
            ))}
          </ol>
        </>
      )}
      {unscheduled > 0 && <ScheduleNotice count={unscheduled} />}
    </section>
  );
}
