"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

function slotLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki" }).format(new Date(iso));
}

export function InviteActions({ shortlistId, companyName }: { shortlistId: string; companyName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  async function respond(accept: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/shortlists/${shortlistId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setError("That didn't work. Please try again.");
      setBusy(false);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { table?: number; slotStart?: string };
    setConfirm(false);
    if (accept) {
      toast.success(
        data.table && data.slotStart
          ? `Meeting booked — Table ${data.table} · ${slotLabel(data.slotStart)}`
          : "Meeting booked — see My day for your time",
      );
    } else toast("Invitation declined. Nothing was shared.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        <Button className="min-h-12 w-full text-base" disabled={busy} onClick={() => respond(true)}>
          Accept &amp; share my name
        </Button>
        <Button variant="outline" className="min-h-12 w-full text-base" disabled={busy} onClick={() => setConfirm(true)}>
          Decline
        </Button>
      </div>
      <p role="alert" aria-live="assertive" className="mt-2 text-sm text-destructive">{error}</p>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this invitation?</DialogTitle>
            <DialogDescription>
              {companyName} won&apos;t learn who you are. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setConfirm(false)}>Keep invitation</Button>
            <Button variant="destructive" className="min-h-11" disabled={busy} onClick={() => respond(false)}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
