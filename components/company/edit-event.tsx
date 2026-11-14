"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventSelect, type EventChoice } from "./event-select";

/** Move a problem to another upcoming event. Locked once an event-day meeting is booked for it. */
export function EditEvent({
  cardId, eventId, events, locked,
}: {
  cardId: string;
  eventId: string;
  events: EventChoice[];
  locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(eventId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cards/${cardId}/event`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: value }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return;
    }
    toast.success("Event updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setValue(eventId);
          setError("");
          setOpen(true);
        }}
      >
        <CalendarRange aria-hidden="true" /> Change event
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Which event is this problem for?</DialogTitle>
            <DialogDescription>
              {locked
                ? "An event-day meeting is already booked for this problem, so it stays with its event."
                : "If your decide-by date matched the old event, it moves with it."}
            </DialogDescription>
          </DialogHeader>
          <EventSelect id="edit-event" events={events} value={value} onChange={setValue} disabled={locked} />
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy || locked || value === eventId} onClick={() => void save()}>{busy ? "Saving…" : "Save event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
