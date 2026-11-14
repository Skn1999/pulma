import { fmtTime } from "./format";

export interface CompanyDayRow {
  time: string;
  table: number;
  responseCode: string;
  talentName: string;
}

export function CompanyDay({
  companyName,
  rows,
  unscheduled,
}: {
  companyName: string;
  rows: CompanyDayRow[];
  unscheduled: number;
}) {
  return (
    <section aria-labelledby="my-day-company" className="space-y-4">
      <h2 id="my-day-company" className="text-2xl font-semibold">
        Your day, {companyName}
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No meetings booked for {companyName} yet.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={`${r.time}-${r.table}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <span className="font-display text-xl font-semibold tabular-nums">{r.time}</span>
              <span className="text-sm text-muted-foreground">Table {r.table}</span>
              <span className="font-medium">Response #{r.responseCode}</span>
              <span className="text-sm">{r.talentName}</span>
            </li>
          ))}
        </ol>
      )}
      {unscheduled > 0 && <ScheduleNotice count={unscheduled} />}
    </section>
  );
}

export interface TalentDayRow {
  time: string;
  table: number;
  companyName: string;
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
    <section aria-labelledby="my-day-talent" className="space-y-4">
      <h2 id="my-day-talent" className="text-2xl font-semibold">
        Your day
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No meetings booked for you yet. They appear once a company accepts your response and you accept the invite.</p>
      ) : (
        <>
          {arrival && (
            <p className="rounded-xl border border-primary/30 bg-accent p-4 text-accent-foreground">
              <span className="block text-sm font-medium">Arrive at</span>
              <time dateTime={arrival} className="font-display text-3xl font-semibold tabular-nums">
                {fmtTime(arrival)}
              </time>
              <span className="mt-1 block text-sm">Staggered so nobody queues.</span>
            </p>
          )}
          <ol className="space-y-3">
            {rows.map((r) => (
              <li key={`${r.time}-${r.table}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <span className="font-display text-xl font-semibold tabular-nums">{r.time}</span>
                <span className="text-sm text-muted-foreground">Table {r.table}</span>
                <span className="font-medium">{r.companyName}</span>
                <span className="text-sm text-muted-foreground">Your response #{r.responseCode}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {unscheduled > 0 && <ScheduleNotice count={unscheduled} />}
    </section>
  );
}

export function ScheduleNotice({ count }: { count: number }) {
  return (
    <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm">
      {count} accepted {count === 1 ? "meeting" : "meetings"} could not be placed on the timetable yet
      (no free slot). They are still booked and the organisers will follow up.
    </p>
  );
}
