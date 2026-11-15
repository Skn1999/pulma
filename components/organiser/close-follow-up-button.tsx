"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/** Closing keeps the anonymous figures and deletes the event's personal data. Always confirmed first. */
export function CloseFollowUpButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onClose() {
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/close-follow-up`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Follow-up closed. The anonymous figures are kept.");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not close the follow-up. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} disabled={pending}>
        Close follow-up now
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close the follow-up for {eventName}?</DialogTitle>
            <DialogDescription>This cannot be undone. People can no longer record outcomes for this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Deleted for this event</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>All answers</li>
                <li>All shortlists and invitations</li>
                <li>All meetings, next steps and outcomes</li>
                <li>All post-meeting feedback</li>
                <li>All notes about closed answers</li>
                <li>All activity entries about those answers</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Kept</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>The anonymous figures on this page (counts only)</li>
                <li>Problem cards (without answers)</li>
                <li>Accounts, which may take part in other events</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={onClose} disabled={busy}>
              {busy ? "Closing…" : "Close and delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
