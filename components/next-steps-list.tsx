import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { shortDate, type NextStep } from "@/lib/next-steps";

function StepList({ id, title, hint, empty, items }: { id: string; title: string; hint: string; empty: string; items: NextStep[] }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-4">
      <h2 id={id} className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> {empty}
        </p>
      ) : (
        <ul className="mt-3 divide-y">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className="group flex min-h-11 items-start gap-3 rounded-md py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-6">{s.text}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {s.overdue && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                        <AlertTriangle className="size-3" aria-hidden="true" /> Overdue
                      </span>
                    )}
                    {s.due && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden="true" /> {s.overdue ? "Was due" : "Due"} {shortDate(s.due)}
                      </span>
                    )}
                  </span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Waiting on you" and "Waiting on them". Items come from lib/next-steps.ts, which keeps them privacy-safe. */
export function NextStepsPanel({ waitingOnYou, waitingOnThem }: { waitingOnYou: NextStep[]; waitingOnThem: NextStep[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <StepList id="wait-you" title="Waiting on you" hint="Things only you can move forward." empty="Nothing is waiting on you." items={waitingOnYou} />
      <StepList id="wait-them" title="Waiting on them" hint="Promises others made to you." empty="Nobody owes you a reply right now." items={waitingOnThem} />
    </div>
  );
}
