"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FILLED_REASONS, PAUSE_REASONS, type CardState, type CardStateReason } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATE_LABEL: Record<CardState, string> = { open: "Open", paused: "Paused", filled: "Filled" };

/** The problem's status as a badge (word + dot), shown next to the problem title. */
export function ProblemStatusBadge({ state, reason }: { state: CardState; reason?: CardStateReason }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-navy">
      <span className="sr-only">Problem status: </span>
      <span aria-hidden="true" className={state === "open" ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"} />
      {STATE_LABEL[state]}
      {state !== "open" && reason && <span className="sr-only">. Reason: {reason}</span>}
    </span>
  );
}

/** Change the problem's status. Everyone who answered is told; no AI is involved. */
export async function setProblemState(cardId: string, next: CardState, reason?: string): Promise<string | null> {
  const res = await fetch(`/api/cards/${cardId}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: next, reason }),
  }).catch(() => null);
  if (res?.ok) return null;
  const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
  return msg ?? "That didn't save. Please try again.";
}

const DONE_TOAST: Record<CardState, string> = {
  open: "Problem reopened. Everyone who answered has been told.",
  paused: "Problem paused. Everyone who answered has been told.",
  filled: "Problem marked as filled. Everyone who answered has been told.",
};

/** Pause or mark as filled, with the reason everyone who answered will be told. Mounted only while open. */
export function StatusDialog({ cardId, target, onClose }: { cardId: string; target: "paused" | "filled"; onClose: () => void }) {
  const router = useRouter();
  const [chosen, setChosen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reasons: readonly string[] = target === "filled" ? FILLED_REASONS : PAUSE_REASONS;

  async function confirm() {
    setBusy(true);
    setError("");
    const err = await setProblemState(cardId, target, chosen);
    setBusy(false);
    if (err) return setError(err);
    toast.success(DONE_TOAST[target]);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !chosen} onClick={() => void confirm()}>
            {busy ? "Saving…" : target === "filled" ? "Mark as filled" : "Pause problem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
