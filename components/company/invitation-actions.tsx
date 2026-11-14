"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Accept or decline an event invitation. Accepting assigns a table. */
export function InvitationActions({ participationId, eventName }: { participationId: string; eventName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function respond(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    setError("");
    const res = await fetch(`/api/participations/${participationId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return;
    }
    toast.success(accept ? `You're in: ${eventName}` : "Invitation declined");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={() => void respond(true)}>{busy === "accept" ? "Accepting…" : "Accept"}</Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void respond(false)}>{busy === "decline" ? "Declining…" : "Decline"}</Button>
      </div>
      <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>
    </div>
  );
}

/** A confirmed company leaves an event. Only offered while no event-day meeting is booked there. */
export function LeaveEvent({ participationId, eventName }: { participationId: string; eventName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/participations/${participationId}/withdraw`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return;
    }
    toast.success(`You left ${eventName}`);
    router.refresh();
  }

  if (!confirming) {
    return <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>Leave this event</Button>;
  }
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
      <p>Leave {eventName}? Your problems for it are paused, and everyone who answered is told.</p>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" disabled={busy} onClick={() => void leave()}>{busy ? "Leaving…" : "Yes, leave"}</Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Stay</Button>
      </div>
      <p role="alert" className="text-destructive">{error}</p>
    </div>
  );
}
