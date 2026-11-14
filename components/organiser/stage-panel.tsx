"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EventStage } from "@/lib/types";

export interface StageAction {
  to: EventStage;
  label: string;
  explain: string;
  primary?: boolean;
}

async function patch(eventId: string, body: object): Promise<string | null> {
  const res = await fetch(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (res?.ok) return null;
  return (res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined) ?? "That didn't save. Please try again.";
}

/** The one next action for the event, with a plain explanation of what it does. */
export function StageActions({ eventId, actions }: { eventId: string; actions: StageAction[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<EventStage | null>(null);
  const [error, setError] = useState("");

  async function go(a: StageAction) {
    setBusy(a.to);
    setError("");
    const err = await patch(eventId, { stage: a.to });
    setBusy(null);
    if (err) return setError(err);
    toast.success(a.label);
    router.refresh();
  }

  if (actions.length === 0) return <p className="text-sm text-muted-foreground">This event is done. Nothing more to change.</p>;
  return (
    <div className="space-y-4">
      {actions.map((a) => (
        <div key={a.to} className="flex flex-wrap items-center gap-3">
          <Button variant={a.primary ? "default" : "outline"} disabled={busy !== null} onClick={() => void go(a)}>
            {busy === a.to ? "Saving…" : a.label}
          </Button>
          <p className="max-w-xl text-sm text-muted-foreground">{a.explain}</p>
        </div>
      ))}
      <p role="alert" className="text-sm text-destructive">{error}</p>
    </div>
  );
}

/** Problem deadline and description. Locked or finished events keep their deadline. */
export function EventSettings({
  eventId, date, deadline, description, readOnly,
}: {
  eventId: string;
  date: string;
  deadline: string;
  description: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState(deadline);
  const [text, setText] = useState(description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const err = await patch(eventId, { problemDeadline: d, description: text });
    setBusy(false);
    if (err) return setError(err);
    toast.success("Saved");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="ev-deadline" className="text-sm font-medium">Problem deadline</label>
        <Input id="ev-deadline" type="date" required max={date} value={d} disabled={readOnly} onChange={(e) => setD(e.target.value)} className="max-w-52" />
        <p className="text-xs text-muted-foreground">The last day companies can publish a problem for this event.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ev-description" className="text-sm font-medium">Description (optional)</label>
        <Textarea id="ev-description" rows={3} maxLength={400} value={text} disabled={readOnly} onChange={(e) => setText(e.target.value)} aria-describedby="ev-description-hint" />
        <p id="ev-description-hint" className="text-xs text-muted-foreground">Shown to invited companies. {text.length}/400</p>
      </div>
      <p role="alert" className="text-sm text-destructive">{error}</p>
      {!readOnly && <Button type="submit" disabled={busy || (d === deadline && text === description)}>{busy ? "Saving…" : "Save changes"}</Button>}
    </form>
  );
}
