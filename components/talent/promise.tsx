import { CalendarCheck, Hourglass, MapPin, ShieldCheck } from "lucide-react";
import type { HiringGoal } from "@/lib/types";
import { decidingText, modesText, recordText, replyingText } from "@/lib/promise-text";

/** What the company promised on this problem, and its record of keeping such promises. Public; describes the organisation only. */
export function PromiseBlock({
  goal,
  record,
  compact = false,
}: {
  goal: HiringGoal;
  record?: { rate: number | null; counted: number };
  compact?: boolean;
}) {
  const items = [
    { Icon: Hourglass, text: replyingText(goal) },
    { Icon: CalendarCheck, text: decidingText(goal) },
    { Icon: MapPin, text: `Meet: ${modesText(goal.meetModes).toLowerCase()}` },
    ...(record ? [{ Icon: ShieldCheck, text: recordText(record) }] : []),
  ];
  return (
    <ul
      aria-label="The company's promise"
      className={compact ? "mt-2.5 space-y-0.5 text-xs text-muted-foreground" : "mt-4 grid gap-1.5 rounded-lg border border-border bg-card p-3 text-sm sm:grid-cols-2"}
    >
      {items.map(({ Icon, text }) => (
        <li key={text} className="flex items-center gap-1.5">
          <Icon className={compact ? "size-3 shrink-0" : "size-4 shrink-0 text-muted-foreground"} aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}
