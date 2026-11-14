import { Check, Circle, MinusCircle, XCircle } from "lucide-react";

export type TrackStage = 0 | 1 | 2 | 3; // index of current step
const STEPS = ["Sent", "Shortlisted", "Invited", "Meeting booked"];

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
    <ol aria-label="Status" className="mt-3 flex gap-1">
      {steps.map((label, i) => {
        const done = i < cur;
        const current = i === cur;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center text-[0.7rem] leading-tight ${
              current ? "border-primary bg-accent font-semibold text-accent-foreground" : done ? "border-border bg-muted text-foreground" : "border-dashed border-border text-muted-foreground"
            }`}
          >
            {closed && current ? <MinusCircle className="size-4" aria-hidden="true" /> : done || current ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
            <span>{label}</span>
            <span className="sr-only">{done ? "(done)" : current ? "(current)" : "(not yet)"}</span>
          </li>
        );
      })}
    </ol>
  );
}
