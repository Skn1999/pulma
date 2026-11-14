"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target } from "lucide-react";
import type { HiringGoal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoalFields } from "./goal-fields";

export function EditGoal({ cardId, goal }: { cardId: string; goal: HiringGoal }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(goal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cards/${cardId}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return;
    }
    toast.success("Goal updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setDraft(goal);
          setError("");
          setOpen(true);
        }}
      >
        <Target aria-hidden="true" /> Edit goal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Your goal for this problem</DialogTitle>
            <DialogDescription>These are promises to the people who answer.</DialogDescription>
          </DialogHeader>
          <GoalFields goal={draft} onChange={setDraft} />
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save goal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
