import { Check, Circle, XCircle } from "lucide-react";

export type TrackStage = 0 | 1 | 2 | 3; // index of current step
const STEPS = ["Sent", "Shortlisted", "Invited", "Meeting booked"];

export function StatusTrack({ stage, declined }: { stage: TrackStage; declined?: boolean }) {
  if (declined) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <XCircle className="size-4" aria-hidden="true" /> You declined. Nothing was shared.
      </p>
    );
  }
  return (
    <ol aria-label="Status" className="mt-3 flex gap-1">
      {STEPS.map((label, i) => {
        const done = i < stage;
        const current = i === stage;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center text-[0.7rem] leading-tight ${
              current ? "border-primary bg-accent font-semibold text-accent-foreground" : done ? "border-border bg-muted text-foreground" : "border-dashed border-border text-muted-foreground"
            }`}
          >
            {done || current ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
            <span>{label}</span>
            <span className="sr-only">{done ? "(done)" : current ? "(current)" : "(not yet)"}</span>
          </li>
        );
      })}
    </ol>
  );
}
