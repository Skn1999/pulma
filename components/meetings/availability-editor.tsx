"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localSlotLabel } from "@/lib/promise-text";

export interface WindowRow { id: string; mode: "office" | "video"; start: string; end: string }

const TIMES = Array.from({ length: 31 }, (_, i) => {
  const mins = 7 * 60 + i * 30; // 07:00 – 22:00
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 === 0 ? "00" : "30"}`;
});
const MODE_LABEL = { office: "Office visit", video: "Video call" } as const;
const selectCls = "mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring";

export function AvailabilityEditor({ windows, today }: { windows: WindowRow[]; today: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"office" | "video">("video");
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("12:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/availability", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, date, from, to }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "That didn't work. Please try again.");
      return;
    }
    toast.success("Window added");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/availability/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { toast.error("Could not remove that window."); return; }
    toast.success("Window removed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5" aria-labelledby="add-window">
        <h3 id="add-window" className="font-semibold sm:col-span-2 lg:col-span-5">Add a free window</h3>
        <div>
          <label htmlFor="aw-mode" className="text-sm font-medium">Way to meet</label>
          <select id="aw-mode" value={mode} onChange={(e) => setMode(e.target.value as "office" | "video")} className={selectCls}>
            <option value="video">Video call</option>
            <option value="office">Office visit</option>
          </select>
        </div>
        <div>
          <label htmlFor="aw-date" className="text-sm font-medium">Date</label>
          <Input id="aw-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 min-h-11" required />
        </div>
        <div>
          <label htmlFor="aw-from" className="text-sm font-medium">From</label>
          <select id="aw-from" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="aw-to" className="text-sm font-medium">To</label>
          <select id="aw-to" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="min-h-11 w-full" disabled={busy || !date}>Add window</Button>
        </div>
        <p role="alert" aria-live="assertive" className="text-sm text-destructive sm:col-span-2 lg:col-span-5">{error}</p>
        <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">
          Talent can book 30-minute slots inside your windows. Times are Helsinki time.
        </p>
      </form>

      {windows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No windows yet. Add one so people you invite can book a time outside the event day.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {windows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span>
                <span className="font-medium">{MODE_LABEL[w.mode]}</span>
                <span className="text-muted-foreground"> · {localSlotLabel(w.start)}–{w.end.slice(11, 16)}</span>
              </span>
              <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => remove(w.id)} aria-label={`Delete ${MODE_LABEL[w.mode]} window on ${localSlotLabel(w.start)}`}>
                <Trash2 className="size-4" aria-hidden="true" /> Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
