"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Clock, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FollowUpState {
  meetingId: string;
  mine: "next-step" | "not-now" | null;
  mutual: boolean;
  /** Company side only, and only when mutual. */
  talentEmail?: string;
}

export function FollowUp({ side, companyName, state }: { side: "company" | "talent"; companyName?: string; state: FollowUpState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function choose(outcome: "next-step" | "not-now") {
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: state.meetingId, outcome }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save");
      toast.success("Saved. You can change this any time.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const options = [
    { value: "next-step" as const, label: "Next step", Icon: ArrowRight },
    { value: "not-now" as const, label: "Not now", Icon: Clock },
  ];

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p id={`fu-${state.meetingId}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        After your conversation
      </p>
      <div role="group" aria-labelledby={`fu-${state.meetingId}`} className="mt-2 flex flex-wrap gap-2">
        {options.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            aria-pressed={state.mine === value}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              state.mine === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.mine && !state.mutual && (
          <p className="text-muted-foreground">
            You chose &ldquo;{state.mine === "next-step" ? "Next step" : "Not now"}&rdquo;. Only you can see this.
          </p>
        )}
        {state.mutual && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-accent p-2.5 font-medium text-accent-foreground">
            <Handshake aria-hidden="true" className="size-4" />
            You both want a next step.
            {side === "company" && state.talentEmail ? (
              <span>
                Contact: <a className="underline underline-offset-2" href={`mailto:${state.talentEmail}`}>{state.talentEmail}</a>
              </span>
            ) : side === "talent" ? (
              <span className="font-normal">{companyName ?? "The company"} has your email and will be in touch.</span>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
