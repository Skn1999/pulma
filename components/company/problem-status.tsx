"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, CirclePause, CirclePlay } from "lucide-react";
import { FILLED_REASONS, PAUSE_REASONS, type CardState, type CardStateReason } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATE_LABEL: Record<CardState, string> = { open: "Open", paused: "Paused", filled: "Filled" };

/** "Problem status" control: Open / Pause… / Mark as filled…, with the reason everyone who answered will be told. */
export function ProblemStatus({ cardId, state, reason }: { cardId: string; state: CardState; reason?: CardStateReason }) {
  const router = useRouter();
  const [target, setTarget] = useState<"paused" | "filled" | null>(null);
  const [chosen, setChosen] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(next: CardState, why?: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cards/${cardId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: next, reason: why }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      if (next === "open") toast.error(msg ?? "Couldn't reopen. Try again.");
      return;
    }
    toast.success(next === "open" ? "Problem reopened. Everyone who answered has been told." : next === "paused" ? "Problem paused. Everyone who answered has been told." : "Problem marked as filled. Everyone who answered has been told.");
    setTarget(null);
    router.refresh();
  }

  const reasons: readonly string[] = target === "filled" ? FILLED_REASONS : PAUSE_REASONS;

  return (
    <>
      <div role="group" aria-label="Problem status" className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-navy">
          <span className="sr-only">Problem status: </span>
          <span aria-hidden="true" className={state === "open" ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"} />
          {STATE_LABEL[state]}
        </span>
        {state !== "open" && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void send("open")}>
            <CirclePlay aria-hidden="true" /> Reopen
          </Button>
        )}
        {state !== "paused" && (
          <Button variant="outline" size="sm" onClick={() => { setChosen(""); setError(""); setTarget("paused"); }}>
            <CirclePause aria-hidden="true" /> Pause…
          </Button>
        )}
        {state !== "filled" && (
          <Button variant="outline" size="sm" onClick={() => { setChosen(""); setError(""); setTarget("filled"); }}>
            <CircleCheck aria-hidden="true" /> Mark as filled…
          </Button>
        )}
      </div>
      {state !== "open" && reason && <span className="sr-only">Reason: {reason}</span>}
      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{target === "filled" ? "Mark this problem as filled?" : "Pause this problem?"}</DialogTitle>
            <DialogDescription>
              {target === "filled" ? "It stops taking new answers and new invites." : "It stops taking new answers and new invites until you reopen it."} No AI is involved.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Reason</legend>
            {reasons.map((rs) => (
              <label key={rs} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="radio" name="state-reason" className="mt-1 accent-primary" checked={chosen === rs} onChange={() => setChosen(rs)} />
                <span>{rs}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm" aria-live="polite">
            {chosen ? <>Everyone who answered will be told: &lsquo;{chosen}&rsquo;</> : "Choose a reason. Everyone who answered will be told it."}
          </p>
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button disabled={busy || !chosen} onClick={() => target && void send(target, chosen)}>
              {busy ? "Saving…" : target === "filled" ? "Mark as filled" : "Pause problem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
