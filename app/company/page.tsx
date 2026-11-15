import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import { nowMs } from "@/lib/clock";
import { loadDB } from "@/lib/store";
import { eventDay, eventLabel, eventOf, sortedEvents } from "@/lib/events";
import { eventStage, participationOf } from "@/lib/participation";
import { StageBadge } from "@/components/events/stage-badge";
import type { HiringGoal, ProblemCard } from "@/lib/types";
import { requireAccount } from "@/lib/session";
import { goalOf, goalProgress } from "@/lib/deadlines";
import { nextSteps, shortDate } from "@/lib/next-steps";
import { NextStepsPanel } from "@/components/next-steps-list";
import { PageTitle } from "@/components/shell/page-title";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function CompanyHome() {
  const account = await requireAccount("company");
  const companyId = account.companyId ?? "";
  const db = await loadDB();
  const now = nowMs();
  const steps = nextSteps(db, account, now);
  const cards = db.cards.filter((c) => c.companyId === companyId);

  const rows = cards.map((card) => {
    const answers = db.responses.filter((r) => r.cardId === card.id);
    const lists = db.shortlists.filter((s) => s.cardId === card.id);
    const listed = new Set(lists.map((s) => s.responseId));
    const closedIds = new Set(db.closures.filter((c) => c.cardId === card.id).map((c) => c.responseId));
    const progress = goalProgress(db, card, now);
    return {
      card,
      event: eventOf(db, card),
      goal: goalOf(card, db),
      progress,
      answers: answers.length,
      fresh: answers.filter((r) => !listed.has(r.id)).length,
      open: answers.filter((r) => !listed.has(r.id) && !closedIds.has(r.id)).length,
      shortlisted: lists.length,
      accepted: lists.filter((s) => s.status === "accepted").length,
    };
  });

  const groups = sortedEvents(db)
    .map((event) => ({
      event,
      stage: eventStage(event, now),
      table: participationOf(db, event.id, companyId)?.table,
      rows: rows.filter((r) => r.event.id === event.id),
    }))
    .filter((g) => g.rows.length > 0);

  return (
    <div>
      <PageTitle
        title="Problems"
        subtitle="The problems you've brought to the event, and the answers coming in."
        actions={
          <Link href="/company/intake" className={buttonVariants()}>
            New problem
          </Link>
        }
      />
      <div className="px-4 pt-4 sm:px-6">
        <NextStepsPanel {...steps} />
      </div>
      {rows.length === 0 ? (
        <div className="m-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-display text-xl font-semibold">No problems yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Accept an event invitation, then describe something your team is stuck on. It takes about five minutes, and people answer in their own words.
          </p>
          <Link href="/company/intake" className={`${buttonVariants({ size: "lg" })} mt-5`}>
            Bring your first problem
          </Link>
        </div>
      ) : (
        <div className="space-y-8 py-4">
          {groups.map(({ event, stage, table, rows: groupRows }) => (
            <section key={event.id} aria-labelledby={`g-${event.id}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-6">
                <h2 id={`g-${event.id}`} className="font-display text-lg font-semibold">{eventLabel(event)}</h2>
                <StageBadge stage={stage} />
              </div>
              <p className="mt-1 px-4 text-sm text-muted-foreground sm:px-6">
                {table ? `Table ${table} · ` : ""}Problem deadline {eventDay(event.problemDeadline)}
              </p>
              <ProblemsTable rows={groupRows} caption={`Your problems for ${event.name}. Select a title to review its answers.`} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

type Row = {
  card: ProblemCard;
  goal: HiringGoal;
  progress: ReturnType<typeof goalProgress>;
  answers: number;
  fresh: number;
  open: number;
  shortlisted: number;
  accepted: number;
};

function ProblemsTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="whitespace-nowrap border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium sm:px-6">Problem</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 font-medium">Published</th>
                <th scope="col" className="px-3 py-2 font-medium">Decide by</th>
                <th scope="col" className="px-3 py-2 font-medium">Replies</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Answers</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">New</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Open</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Shortlisted</th>
                <th scope="col" className="px-4 py-2 text-right font-medium sm:px-6">Accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ card, goal, progress, answers, fresh, open, shortlisted, accepted }) => (
                <tr key={card.id} className="group relative border-b last:border-0 hover:bg-muted/50 focus-within:bg-muted/50">
                  <th scope="row" className="min-w-56 px-4 py-3 text-left font-medium sm:px-6">
                    <Link
                      href={`/company/card/${card.id}`}
                      className="font-display text-base outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                    >
                      {card.title}
                    </Link>
                  </th>
                  <td className="px-3 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {card.status !== "published" ? "Draft" : progress.state === "paused" ? "Paused" : progress.state === "filled" ? "Filled" : "Published"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{fmt.format(new Date(card.createdAt))}</td>
                  <td className="px-3 py-3">
                    <DecideBy date={goal.decideBy} days={progress.decideByDays} active={card.status === "published" && progress.state === "open"} />
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    {progress.answers === 0 ? (
                      <span className="text-muted-foreground">No answers yet</span>
                    ) : (
                      <>
                        {progress.replied}/{progress.answers}
                        {progress.overdue > 0 && <span className="font-medium"> · {progress.overdue} overdue</span>}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{answers}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fresh > 0 ? (
                      <span className="font-semibold text-primary">{fresh}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{open}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{shortlisted}/5</td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-6">{accepted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  );
}

/**
 * Decide-by date with how close it is. Shape and words carry the urgency as well as colour: passed = red with an
 * alert icon, within a week = amber with a clock, later = plain with a quiet "in N days". Paused, filled and draft
 * problems show the date only: nothing is waiting on it.
 */
function DecideBy({ date, days, active }: { date: string; days: number; active: boolean }) {
  const when = days < 0 ? (days === -1 ? "1 day ago" : `${-days} days ago`) : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  if (!active) return <span className="whitespace-nowrap text-muted-foreground">{shortDate(date)}</span>;
  if (days < 0)
    return (
      <span className="block whitespace-nowrap text-destructive">
        <span className="inline-flex items-center gap-1 font-semibold">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {shortDate(date)}
        </span>
        <span className="block text-xs font-medium">Date passed · {when}</span>
      </span>
    );
  if (days <= 7)
    return (
      <span className="block whitespace-nowrap text-warning">
        <span className="inline-flex items-center gap-1 font-semibold">
          <Clock className="size-3.5" aria-hidden="true" />
          {shortDate(date)}
        </span>
        <span className="block text-xs font-medium">{when}</span>
      </span>
    );
  return (
    <span className="block whitespace-nowrap">
      {shortDate(date)}
      <span className="block text-xs text-muted-foreground">{when}</span>
    </span>
  );
}
