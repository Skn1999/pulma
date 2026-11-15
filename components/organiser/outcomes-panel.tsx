import { AlertTriangle, CheckCircle2, Clock, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CloseFollowUpButton } from "@/components/organiser/close-follow-up-button";
import { shortDate } from "@/lib/next-steps";
import { followUpEnd, nextStepsPlannedTotal, type FollowUpState } from "@/lib/outcomes";
import { NEXT_STEP_LABEL, NEXT_STEP_KINDS, type Event, type OutcomeReport } from "@/lib/types";

const card = "rounded-xl bg-card p-4 ring-1 ring-foreground/10";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dash = (v: number | null, unit: string) => (v === null ? "Not enough data yet (needs 5)" : `${v}${unit}`);

/** Anonymous follow-up figures for one event. Counts and problem titles only: never a person. */
export function OutcomesPanel({ ev, state, report }: { ev: Event; state: Exclude<FollowUpState, "before">; report: OutcomeReport }) {
  const f = report.funnel;
  const steps: { label: string; n: number }[] = [
    { label: "Problems", n: f.problems },
    { label: "Answers", n: f.answers },
    { label: "Shortlisted", n: f.shortlisted },
    { label: "Accepted the invitation", n: f.accepted },
    { label: "Meetings held", n: f.meetingsHeld },
    { label: "Next step agreed by both", n: f.nextStepAgreed },
    { label: "Hired", n: f.hired },
  ];
  const max = Math.max(1, ...steps.map((s) => s.n));
  const planned = nextStepsPlannedTotal(report);
  const final = state === "final";

  return (
    <div className="space-y-6">
      <section aria-labelledby="out-status" className={`${card} space-y-3`}>
        <h2 id="out-status" className="sr-only">Status</h2>
        <p className="flex items-center gap-2 text-sm font-medium">
          {final ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Clock className="size-4" aria-hidden="true" />}
          {final
            ? `Final · closed ${shortDate(ev.closedAt ?? report.asOf)}`
            : `Still settling · last updated ${shortDate(report.asOf)} · window closes ${shortDate(followUpEnd(ev))}`}
        </p>
        <p className="text-sm text-muted-foreground">
          Counts only. No names, emails or answers appear here.
          {final ? " The personal data for this event was deleted when the follow-up closed." : " When the window closes, the personal data for this event is deleted and these figures stay."}
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/events/${ev.id}/outcomes.csv`} download className={buttonVariants({ variant: "outline" })}>
            <Download aria-hidden="true" /> Download CSV
          </a>
          {!final && <CloseFollowUpButton eventId={ev.id} eventName={ev.name} />}
        </div>
      </section>

      <section aria-labelledby="out-funnel" className={card}>
        <h2 id="out-funnel" className="font-display text-base font-semibold">From problem to hire</h2>
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.n}
                  {i > 0 && steps[i - 1].n > 0
                    ? i === 1
                      ? ` · ${Math.round((s.n / steps[0].n) * 10) / 10} per problem` // answers are not a share of problems
                      : ` · ${Math.round((s.n / steps[i - 1].n) * 100)}% of ${steps[i - 1].label.toLowerCase()}`
                    : ""}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(s.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="out-event" className={card}>
          <h2 id="out-event" className="font-display text-base font-semibold">At the event</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4"><dt>Meetings held</dt><dd className="tabular-nums">{f.meetingsHeld}</dd></div>
            <div className="flex justify-between gap-4"><dt>Both chose a next step</dt><dd className="tabular-nums">{f.nextStepAgreed}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="out-since" className={card}>
          <h2 id="out-since" className="font-display text-base font-semibold">Since the event</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4"><dt>Next steps planned</dt><dd className="tabular-nums">{planned}</dd></div>
            {NEXT_STEP_KINDS.filter((k) => f.nextStepPlanned[k] > 0).map((k) => (
              <div key={k} className="flex justify-between gap-4 pl-4 text-muted-foreground"><dt>{NEXT_STEP_LABEL[k]}</dt><dd className="tabular-nums">{f.nextStepPlanned[k]}</dd></div>
            ))}
            <div className="flex justify-between gap-4"><dt>Hired</dt><dd className="tabular-nums">{f.hired}</dd></div>
            <div className="flex justify-between gap-4"><dt>Still talking</dt><dd className="tabular-nums">{f.stillTalking}</dd></div>
            <div className="flex justify-between gap-4"><dt>Not this time</dt><dd className="tabular-nums">{f.notThisTime}</dd></div>
            <div className="flex justify-between gap-4"><dt>Candidate took another job</dt><dd className="tabular-nums">{f.talentWithdrew}</dd></div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="out-promises" className={card}>
        <h2 id="out-promises" className="font-display text-base font-semibold">Promises</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-4"><dt>Median days for a company to reply</dt><dd className="tabular-nums">{dash(report.promises.medianReplyDays, " days")}</dd></div>
          <div className="flex justify-between gap-4"><dt>Reply promises kept</dt><dd className="tabular-nums">{dash(report.promises.replyKeptPct, "%")}</dd></div>
          <div className="flex justify-between gap-4"><dt>Next-step promises kept</dt><dd className="tabular-nums">{dash(report.promises.nextStepKeptPct, "%")}</dd></div>
          <div className="flex justify-between gap-4">
            <dt>Promises overdue {final ? "when closed" : "now"}</dt>
            <dd className="tabular-nums">
              {report.promises.overdueNow > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium"><AlertTriangle className="size-3.5" aria-hidden="true" /> {report.promises.overdueNow}</span>
              ) : (
                0
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="out-none" className={card}>
        <h2 id="out-none" className="font-display text-base font-semibold">Problems with no next step</h2>
        <p className="mt-1 text-sm text-muted-foreground">A cue to talk with the company. These are problems, not people.</p>
        {report.problemsWithoutNextStep.length === 0 ? (
          <p className="mt-3 text-sm">Every problem led to a next step.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {report.problemsWithoutNextStep.map((p) => (
              <li key={p.cardId}>
                <span className="font-medium">{p.title}</span> <span className="text-muted-foreground">· {p.companyName}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{plural(report.problemsWithoutNextStep.length, "problem")} of {f.problems}.</p>
      </section>
    </div>
  );
}
