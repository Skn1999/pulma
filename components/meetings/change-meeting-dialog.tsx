"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MEETING_CHANGE_REASONS } from "@/lib/types";
import { PickTime, type Option } from "./pick-time";

export type ChangeAction = "move" | "ask-move" | "cancel";

const COPY: Record<ChangeAction, { button: string; title: string; description: string; confirm: string }> = {
  move: { button: "Move meeting", title: "Move this meeting", description: "Choose why, then pick a new time. The company is told the reason.", confirm: "Move to this time" },
  "ask-move": { button: "Ask to move", title: "Ask to move this meeting", description: "They will be asked to pick a new time. They are told your reason.", confirm: "Ask to move" },
  cancel: { button: "Cancel meeting", title: "Cancel this meeting?", description: "The other side is told the reason. This can't be undone.", confirm: "Cancel meeting" },
};

async function errorOf(res: Response | null): Promise<string> {
  if (!res) return "That didn't work. Please try again.";
  const j = (await res.json().catch(() => null)) as { error?: string } | null;
  return j?.error ?? "That didn't work. Please try again.";
}

export function ChangeMeetingDialog({
  meetingId, action, onChanged,
}: {
  meetingId: string;
  action: ChangeAction;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const c = COPY[action];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectId = `reason-${action}-${meetingId}`;

  async function done(message: string) {
    toast.success(message);
    setOpen(false);
    setReason("");
    await onChanged();
    router.refresh();
  }

  async function post(path: string, body: unknown, message: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/meetings/${meetingId}/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setError(await errorOf(res)); return; }
    await done(message);
  }

  const reasonField = (
    <div>
      <label htmlFor={selectId} className="text-sm font-medium">Reason</label>
      <select
        id={selectId}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <option value="">Choose a reason…</option>
        {MEETING_CHANGE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Button variant="outline" className="min-h-11" onClick={() => { setError(""); setOpen(true); }}>{c.button}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reasonField}
            {action === "move" && reason && (
              <PickTime
                meetingId={meetingId}
                busy={busy}
                submitLabel={c.confirm}
                onPick={(o: Option) => post("book", { mode: o.mode, start: o.start, reason }, "Meeting moved")}
              />
            )}
            <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>
          </div>
          {action !== "move" && (
            <DialogFooter>
              <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Keep meeting</Button>
              <Button
                variant={action === "cancel" ? "destructive" : "default"}
                className="min-h-11"
                disabled={!reason || busy}
                onClick={() => post(action === "cancel" ? "cancel" : "reschedule", { reason }, action === "cancel" ? "Meeting cancelled" : "Asked to move")}
              >
                {c.confirm}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
