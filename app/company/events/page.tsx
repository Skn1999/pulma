import Link from "next/link";
import { PageTitle } from "@/components/shell/page-title";
import { StageBadge, ParticipationBadge } from "@/components/events/stage-badge";
import { InvitationActions, LeaveEvent } from "@/components/company/invitation-actions";
import { WhyJoin } from "@/components/company/why-join";
import { exampleAnswer, platformOutcomes } from "@/lib/outcomes";
import { fmtDay } from "@/components/event/format";
import { buttonVariants } from "@/components/ui/button";
import { getDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { requireAccount } from "@/lib/session";
import { eventById, eventDay } from "@/lib/events";
import { canPublishTo, eventStage, hasBookedMeetings, publishedCountIn } from "@/lib/participation";
import { MAX_PROBLEMS_PER_EVENT, type Event, type Participation } from "@/lib/types";

export const dynamic = "force-dynamic";

function Facts({ ev }: { ev: Event }) {
  return (
    <>
      <p className="text-sm text-muted-foreground">{fmtDay(ev.date)} · {ev.startTime}–{ev.endTime}</p>
      <p className="mt-1 text-sm">{ev.venue}</p>
      {ev.focus && <p className="text-sm text-muted-foreground">{ev.focus}</p>}
    </>
  );
}

export default async function CompanyEventsPage() {
  const account = await requireAccount("company");
  const companyId = account.companyId ?? "";
  const db = getDB();
  const now = nowMs();
  const mine = db.participations
    .filter((p) => p.companyId === companyId)
    .map((p) => ({ p, ev: eventById(db, p.eventId) }))
    // A draft event is the organiser's alone: an invitation to one shows up once the event opens.
    .filter((x): x is { p: Participation; ev: Event } => !!x.ev && x.ev.stage !== "draft");
  const byDate = (a: { ev: Event }, b: { ev: Event }) => (a.ev.date < b.ev.date ? -1 : a.ev.date > b.ev.date ? 1 : 0);
  const stageOf = (ev: Event) => eventStage(ev, now);

  const invitations = mine.filter((x) => x.p.status === "invited" && stageOf(x.ev) !== "done").sort(byDate);
  const current = mine.filter((x) => x.p.status === "confirmed" && stageOf(x.ev) !== "done").sort(byDate);
  const past = mine.filter((x) => stageOf(x.ev) === "done" || x.p.status === "declined" || x.p.status === "withdrawn").sort(byDate).reverse();

  return (
    <>
      <PageTitle title="Events" subtitle="The organisers invite you. Once you accept, you get a table and can publish up to 3 problems." />
      <div className="space-y-8 px-4 py-6 sm:px-6">
        {(invitations.length > 0 || current.length === 0) && (
          <WhyJoin outcomes={platformOutcomes(db, now)} example={exampleAnswer(db)} />
        )}
        <section aria-labelledby="inv-h" className="space-y-3">
          <h2 id="inv-h" className="font-display text-lg font-semibold">Invitations</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invitations right now. When the event team invites you, it shows up here.</p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {invitations.map(({ p, ev }) => (
                <li key={p.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{ev.name}</h3>
                    <ParticipationBadge status="invited" />
                  </div>
                  <Facts ev={ev} />
                  {ev.description && <p className="mt-2 text-sm">{ev.description}</p>}
                  <p className="mt-2 text-sm text-muted-foreground">Problems can be published until {eventDay(ev.problemDeadline)}.</p>
                  {p.note && (
                    <figure className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
                      <figcaption className="text-xs font-medium text-muted-foreground">Message from the event team</figcaption>
                      <blockquote className="mt-1">{p.note}</blockquote>
                    </figure>
                  )}
                  <div className="mt-4">
                    <InvitationActions participationId={p.id} eventName={ev.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="yours-h" className="space-y-3">
          <h2 id="yours-h" className="font-display text-lg font-semibold">Your events</h2>
          {current.length === 0 ? (
            <p className="text-sm text-muted-foreground">You can publish a problem once you have accepted an event invitation.</p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {current.map(({ p, ev }) => {
                const can = canPublishTo(db, companyId, ev.id, now);
                const used = publishedCountIn(db, companyId, ev.id);
                const booked = hasBookedMeetings(db, ev.id, companyId);
                return (
                  <li key={p.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold">{ev.name}</h3>
                      <StageBadge stage={stageOf(ev)} />
                    </div>
                    <Facts ev={ev} />
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <div><dt className="inline text-muted-foreground">Your table </dt><dd className="inline font-medium tabular-nums">{p.table}</dd></div>
                      <div><dt className="inline text-muted-foreground">Problem deadline </dt><dd className="inline font-medium">{eventDay(ev.problemDeadline)}</dd></div>
                      <div><dt className="inline text-muted-foreground">Problems </dt><dd className="inline font-medium tabular-nums">{used} of {MAX_PROBLEMS_PER_EVENT}</dd></div>
                    </dl>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {can.ok ? (
                        <Link href={`/company/intake?event=${ev.id}`} className={buttonVariants()}>Publish a problem</Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">{can.reason}</p>
                      )}
                      {!booked && stageOf(ev) === "open" && <LeaveEvent participationId={p.id} eventName={ev.name} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section aria-labelledby="past-h" className="space-y-3">
            <h2 id="past-h" className="font-display text-lg font-semibold">Past</h2>
            <ul className="space-y-2">
              {past.map(({ p, ev }) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
                  <span className="font-medium">{ev.name}</span>
                  <span className="text-muted-foreground">{eventDay(ev.date)}</span>
                  <ParticipationBadge status={p.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
