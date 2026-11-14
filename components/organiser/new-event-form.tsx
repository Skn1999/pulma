"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Organiser-only. Slots are always 10 minutes. Nothing here is about people. */
export function NewEventForm() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", date: "", startTime: "10:00", endTime: "14:00", tables: "6", venue: "", focus: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, tables: Number(v.tables) }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return;
    }
    toast.success("Event created");
    setV({ ...v, name: "", date: "", venue: "", focus: "" });
    router.refresh();
  }

  return (
    <section aria-labelledby="new-event-h" className="max-w-2xl rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="new-event-h" className="font-display text-lg font-semibold">New event</h2>
      <form onSubmit={(e) => void submit(e)} className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="ev-name" label="Name"><Input id="ev-name" required minLength={3} maxLength={80} value={v.name} onChange={set("name")} /></Field>
        </div>
        <Field id="ev-date" label="Date"><Input id="ev-date" type="date" required value={v.date} onChange={set("date")} /></Field>
        <Field id="ev-tables" label="Tables" hint="1 to 30. Meetings are 10 minutes.">
          <Input id="ev-tables" type="number" min={1} max={30} required value={v.tables} onChange={set("tables")} />
        </Field>
        <Field id="ev-start" label="Starts" hint="On a 10-minute mark."><Input id="ev-start" type="time" step={600} required value={v.startTime} onChange={set("startTime")} /></Field>
        <Field id="ev-end" label="Ends"><Input id="ev-end" type="time" step={600} required value={v.endTime} onChange={set("endTime")} /></Field>
        <div className="sm:col-span-2">
          <Field id="ev-venue" label="Venue" hint='Use a fictional venue and mark it "(demo venue)".'>
            <Input id="ev-venue" required maxLength={120} value={v.venue} onChange={set("venue")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id="ev-focus" label="Focus (optional)"><Input id="ev-focus" maxLength={120} value={v.focus} onChange={set("focus")} /></Field>
        </div>
        <div className="sm:col-span-2">
          <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create event"}</Button>
        </div>
      </form>
    </section>
  );
}
