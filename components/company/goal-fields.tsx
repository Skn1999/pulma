"use client";

import { useId } from "react";
import { GOAL_LIMITS } from "@/lib/deadlines";
import { MEET_MODES, MEET_MODE_LABEL, type HiringGoal, type MeetMode } from "@/lib/types";
import { Input } from "@/components/ui/input";

const range = ([lo, hi]: readonly [number, number]) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const selectCls =
  "h-9 min-h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Controlled editor for a problem's HiringGoal: the promises the company makes to the people who answer. */
export function GoalFields({ goal, onChange }: { goal: HiringGoal; onChange: (g: HiringGoal) => void }) {
  const uid = useId();
  const toggle = (m: MeetMode) => {
    const has = goal.meetModes.includes(m);
    const next = has ? goal.meetModes.filter((x) => x !== m) : MEET_MODES.filter((x) => x === m || goal.meetModes.includes(x));
    if (next.length > 0) onChange({ ...goal, meetModes: next });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-decide`} className="text-sm font-medium">We will decide by</label>
        <Input id={`${uid}-decide`} type="date" value={goal.decideBy} onChange={(e) => e.target.value && onChange({ ...goal, decideBy: e.target.value })} className="max-w-48" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-reply`} className="text-sm font-medium">Every answer gets a reply within</label>
          <select id={`${uid}-reply`} className={selectCls} value={goal.replyWithinDays} onChange={(e) => onChange({ ...goal, replyWithinDays: Number(e.target.value) })}>
            {range(GOAL_LIMITS.replyWithinDays).map((n) => <option key={n} value={n}>{n} {n === 1 ? "day" : "days"}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-invite`} className="text-sm font-medium">An invite stays open for</label>
          <select id={`${uid}-invite`} className={selectCls} value={goal.inviteDays} onChange={(e) => onChange({ ...goal, inviteDays: Number(e.target.value) })}>
            {range(GOAL_LIMITS.inviteDays).map((n) => <option key={n} value={n}>{n} {n === 1 ? "day" : "days"}</option>)}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Ways we can meet <span className="font-normal text-muted-foreground">(at least one)</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEET_MODES.map((m) => (
            <label key={m} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
              <input type="checkbox" checked={goal.meetModes.includes(m)} onChange={() => toggle(m)} className="size-4 accent-[var(--primary)]" />
              {MEET_MODE_LABEL[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        People who answer will see these promises on your card. If a reply is late, they are told. Nothing closes by itself.
      </p>
    </div>
  );
}
