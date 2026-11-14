import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrackStage = 0 | 1 | 2 | 3; // index of current step
const STEPS = ["Sent", "Shortlisted", "Invited", "Meeting booked"];

/**
 * A slim stepper: small dots on a thin line, filled up to the current step, and the current step named next to
 * it ("Shortlisted · 2 of 4"). Every step is in the list for screen readers, with done / current / not yet.
 * Shape carries the state as well as colour: done = filled dot, current = ringed dot, not yet = hollow dot.
 */
export function StatusTrack({ stage, declined, closed }: { stage: TrackStage; declined?: boolean; closed?: boolean }) {
  if (declined) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <XCircle className="size-4" aria-hidden="true" /> You declined. Nothing was shared.
      </p>
    );
  }
  const steps = closed ? ["Sent", "Not this time"] : STEPS;
  const cur = closed ? 1 : stage;

  return (
    <div className="mt-3 flex items-center gap-3">
      <ol aria-label="Status" className="flex shrink-0 items-center">
        {steps.map((label, i) => {
          const done = i < cur;
          const current = i === cur;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn("h-0.5 w-5 sm:w-7", i <= cur ? (closed ? "bg-muted-foreground/50" : "bg-primary") : "bg-border")}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "block rounded-full",
                  current
                    ? closed
                      ? "size-2.5 bg-muted-foreground ring-4 ring-muted"
                      : "size-2.5 bg-primary ring-4 ring-primary/20"
                    : done
                      ? "size-2 bg-primary"
                      : "size-2 border-2 border-border bg-card",
                )}
              />
              <span className="sr-only">
                {label} ({done ? "done" : current ? "current" : "not yet"})
              </span>
            </li>
          );
        })}
      </ol>
      <p aria-hidden="true" className={cn("text-sm", closed ? "text-muted-foreground" : "font-medium text-navy")}>
        {steps[cur]}
        {!closed && <span className="font-normal text-muted-foreground"> · {cur + 1} of {steps.length}</span>}
      </p>
    </div>
  );
}
