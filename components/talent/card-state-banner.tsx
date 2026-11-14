import { CirclePause } from "lucide-react";
import type { CardState } from "@/lib/types";

/** Shown to talent when a company paused or filled a problem. Text plus icon, never colour alone. */
export function CardStateBanner({ state, companyName, reason }: { state: CardState; companyName: string; reason?: string }) {
  if (state === "open") return null;
  return (
    <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border bg-muted/60 p-3 text-sm">
      <CirclePause className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">{companyName} {state === "filled" ? "closed" : "paused"} this problem</span>
        {reason ? `: ${reason}` : ""}
      </span>
    </p>
  );
}
