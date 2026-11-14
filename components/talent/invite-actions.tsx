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

/** The company's optional, human-written line, shown as a quote from them. */
export function InviteMessage({ message, companyName }: { message: string; companyName: string }) {
  return (
    <figure className="mt-3 border-l-2 border-primary pl-3">
      <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Why they&apos;d like to talk
      </figcaption>
      <blockquote className="mt-1 text-sm leading-6">“{message}”</blockquote>
      <p className="mt-1 text-xs text-muted-foreground">— {companyName}</p>
    </figure>
  );
}

export function InviteActions({ shortlistId, companyName, responseId }: { shortlistId: string; companyName: string; responseId: string }) {
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
      const msg = res?.status === 409 ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't work. Please try again.");
      setConfirm(false);
      setBusy(false);
      if (res?.status === 409) router.refresh();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { table?: number; slotStart?: string; eventName?: string; needsSlot?: boolean; meetingId?: string };
    setConfirm(false);
    if (accept && data.needsSlot) {
      toast.success("Pick a time");
      router.push(`/talent/answers/${responseId}`);
      return;
    }
    if (accept) {
      toast.success(
        data.table && data.slotStart
          ? `Meeting booked — Table ${data.table}${data.eventName ? ` at ${data.eventName}` : ""} · ${slotLabel(data.slotStart)}`
          : "Meeting booked — see Meetings for your time",
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
