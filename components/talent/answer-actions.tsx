"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function AnswerActions({ responseId, cardId }: { responseId: string; cardId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/responses/${responseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not withdraw");
      toast.success("Answer withdrawn");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not withdraw");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <Link
        href={`/talent/card/${cardId}/answer`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-input bg-card px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <Pencil className="size-4" aria-hidden="true" /> Edit
      </Link>
      <Button type="button" variant="outline" className="min-h-11 gap-1.5 px-4 text-sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden="true" /> Withdraw
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setError(""); setBusy(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw your answer?</DialogTitle>
            <DialogDescription>It&apos;s deleted for good and the company will no longer see it.</DialogDescription>
          </DialogHeader>
          <p aria-live="polite" role={error ? "alert" : undefined} className="text-sm font-medium text-destructive">{error}</p>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Keep it</Button>
            <Button type="button" className="min-h-11" disabled={busy} onClick={withdraw}>
              {busy ? "Withdrawing…" : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
