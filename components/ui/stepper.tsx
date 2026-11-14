import { cn } from "@/lib/utils";

export type StepperState = "done" | "current" | "todo" | "skipped";

export interface StepperStep {
  label: string;
  state: StepperState;
}

const STATE_WORD: Record<StepperState, string> = { done: "done", current: "current", todo: "not yet", skipped: "skipped" };

/**
 * Slim stepper: small dots on a thin line, filled up to the current step, with the current step named beside it
 * ("Shortlisted · 2 of 5"). Shape carries the state as well as colour: done = filled dot, current = ringed dot,
 * not yet = hollow dot, skipped = a short dash. Every step is listed for screen readers with its state.
 * `muted` greys the line out (closed / declined): the outcome is shown, not celebrated.
 */
export function Stepper({ steps, muted = false, className }: { steps: StepperStep[]; muted?: boolean; className?: string }) {
  const curIndex = steps.findIndex((s) => s.state === "current");
  const lastDone = steps.map((s) => s.state).lastIndexOf("done");
  const shownIndex = curIndex >= 0 ? curIndex : lastDone;
  const reached = Math.max(curIndex, lastDone);
  const fill = muted ? "bg-muted-foreground" : "bg-primary";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <ol aria-label="Progress" className="flex shrink-0 items-center">
        {steps.map((s, i) => (
          <li key={`${s.label}-${i}`} aria-current={s.state === "current" ? "step" : undefined} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className={cn("h-0.5 w-5 sm:w-7", i <= reached ? (muted ? "bg-muted-foreground/50" : "bg-primary") : "bg-border")} />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "block rounded-full",
                s.state === "current" && cn("size-2.5 ring-4", fill, muted ? "ring-muted" : "ring-primary/20"),
                s.state === "done" && cn("size-2", fill),
                s.state === "todo" && "size-2 border-2 border-border bg-card",
                s.state === "skipped" && "h-0.5 w-2 rounded-none bg-muted-foreground/50",
              )}
            />
            <span className="sr-only">
              {s.label} ({STATE_WORD[s.state]})
            </span>
          </li>
        ))}
      </ol>
      {shownIndex >= 0 && (
        <p aria-hidden="true" className={cn("text-sm", muted ? "text-muted-foreground" : "font-medium text-navy")}>
          {steps[shownIndex].label}
          {!muted && (
            <span className="font-normal text-muted-foreground">
              {" "}· {shownIndex + 1} of {steps.length}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
