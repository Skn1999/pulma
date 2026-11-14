"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MEET_MODE_LABEL, type TalentGoal } from "@/lib/types";
import { shortDate } from "@/lib/next-steps";
import { GoalForm } from "./goal-form";

const STATUS_LABEL: Record<TalentGoal["status"], string> = {
  active: "Actively looking",
  open: "Open to the right thing",
  exploring: "Just exploring",
};

/** A one-line summary of a goal that is already set, with an Edit button that opens the form in place. */
export function GoalSummary({ goal }: { goal: TalentGoal }) {
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // After the form closes, put keyboard focus back on the Edit button it was opened from.
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  function close() {
    returnFocus.current = true;
    setEditing(false);
  }

  if (editing) return <GoalForm initial={goal} onDone={close} autoFocus />;

  const parts = [
    STATUS_LABEL[goal.status],
    goal.availableFrom ? `available from ${shortDate(goal.availableFrom)}` : null,
    goal.meetModes.length ? goal.meetModes.map((m) => MEET_MODE_LABEL[m]).join(", ") : "any way to meet",
  ].filter(Boolean);

  return (
    <section aria-labelledby="goal-h" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
      <h2 id="goal-h" className="inline-flex items-center gap-1.5 font-medium">
        <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Your goal<span className="sr-only">, only you can see it</span>
      </h2>
      <p className="min-w-0 flex-1 text-muted-foreground">{parts.join(" · ")}</p>
      <Button ref={editRef} variant="ghost" size="sm" className="min-h-9 gap-1.5" aria-label="Edit your goal" onClick={() => setEditing(true)}>
        <Pencil className="size-3.5" aria-hidden="true" /> Edit
      </Button>
    </section>
  );
}
