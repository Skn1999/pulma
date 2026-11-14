"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarClock, CalendarX2, Download } from "lucide-react";
import { toast } from "sonner";
import type { ThreadView } from "@/lib/thread";
import { MEET_MODE_LABEL } from "@/lib/types";
import { localSlotLabel } from "@/lib/promise-text";
import { ChangeMeetingDialog } from "./change-meeting-dialog";
import { PickTime, type Option } from "./pick-time";

type Meeting = NonNullable<ThreadView["meeting"]>;

function changeText(m: Meeting, viewer: "talent" | "company", company: string): string | null {
  const c = m.lastChange;
  if (!c) return null;
  if (c.kind === "cancel") return null;
  if (c.by === "company") return `${viewer === "company" ? "You" : company} asked to move: ${c.reason}`;
  return `${viewer === "talent" ? "You" : "They"} moved the meeting: ${c.reason}`;
}

export function MeetingPanel({
  meeting: m, viewer, companyName, counterpartName, onChanged,
}: {
  meeting: Meeting;
  viewer: "talent" | "company";
  companyName: string;
  counterpartName?: string;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const note = changeText(m, viewer, companyName);

  async function book(o: Option) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/meetings/${m.id}/book`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: o.mode, start: o.start }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "That didn't work. Please try again.");
      return;
    }
    toast.success("Meeting booked");
    await onChanged();
    router.refresh();
  }

  if (m.status === "cancelled") {
    return (
      <section className="flex items-start gap-2 rounded-lg border bg-muted/60 p-3 text-sm" aria-labelledby="thread-meeting-c">
        <CalendarX2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <h3 id="thread-meeting-c" className="font-semibold">Meeting cancelled</h3>
          <p className="mt-1 text-muted-foreground">
            {m.lastChange
              ? `This meeting was cancelled (${m.lastChange.reason})${m.lastChange.by === viewer ? " by you" : ""}.`
              : "This meeting was cancelled."}
          </p>
        </div>
      </section>
    );
  }

  if (m.status === "pending" || m.status === "reschedule") {
    const heading = m.status === "pending" ? "Meeting accepted · time not picked yet" : "A new time is needed";
    return (
      <section className="space-y-3 rounded-lg border bg-muted/60 p-3 text-sm" aria-labelledby="thread-meeting-p">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <h3 id="thread-meeting-p" className="font-semibold">{heading}</h3>
            {note && <p className="mt-1 text-muted-foreground">{note}</p>}
            <p className="mt-1 text-muted-foreground">
              {viewer === "company"
                ? "They are choosing a time. Add free windows under Meetings so they have options."
                : "Pick a time that works for you."}
            </p>
          </div>
        </div>
        {viewer === "talent" && (
          <>
            <PickTime meetingId={m.id} busy={busy} onPick={book} />
            <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>
            <ChangeMeetingDialog meetingId={m.id} action="cancel" onChanged={onChanged} />
          </>
        )}
        {viewer === "company" && <ChangeMeetingDialog meetingId={m.id} action="cancel" onChanged={onChanged} />}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-primary/40 bg-accent p-3" aria-labelledby="thread-meeting">
      <div className="flex items-start gap-2">
        <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="text-sm">
          <h3 id="thread-meeting" className="font-semibold">Meeting booked · {MEET_MODE_LABEL[m.mode]}</h3>
          {m.start && (
            <p className="mt-1">
              {m.table ? `Table ${m.table} · ` : ""}{localSlotLabel(m.start)}
              {counterpartName ? ` · with ${counterpartName}` : ""}
            </p>
          )}
          {m.place && (
            <p className="mt-0.5 break-all">{m.mode === "video" ? "Video link: " : m.mode === "office" ? "Address: " : ""}{m.place}</p>
          )}
          {note && <p className="mt-1 text-muted-foreground">{note}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {m.start && (
          <a
            href={`/api/meetings/${m.id}/ics`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            <Download className="size-4" aria-hidden="true" /> Add to calendar
          </a>
        )}
        <ChangeMeetingDialog meetingId={m.id} action={viewer === "talent" ? "move" : "ask-move"} onChanged={onChanged} />
        <ChangeMeetingDialog meetingId={m.id} action="cancel" onChanged={onChanged} />
      </div>
    </section>
  );
}
