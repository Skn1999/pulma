import { XCircle } from "lucide-react";
import { Stepper, type StepperStep } from "@/components/ui/stepper";

export type TrackStage = 0 | 1 | 2 | 3; // index of current step
const STEPS = ["Sent", "Shortlisted", "Invited", "Meeting booked"];

/** Where one of the candidate's answers stands, as a slim stepper (see components/ui/stepper.tsx). */
export function StatusTrack({ stage, declined, closed }: { stage: TrackStage; declined?: boolean; closed?: boolean }) {
  if (declined) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <XCircle className="size-4" aria-hidden="true" /> You declined. Nothing was shared.
      </p>
    );
  }
  const steps: StepperStep[] = closed
    ? [{ label: "Sent", state: "done" }, { label: "Not this time", state: "current" }]
    : STEPS.map((label, i) => ({ label, state: i < stage ? "done" : i === stage ? "current" : "todo" }));
  return <Stepper steps={steps} muted={closed} className="mt-3" />;
}
