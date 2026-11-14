"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MEET_MODE_LABEL, type MeetMode } from "@/lib/types";
import { localSlotLabel } from "@/lib/promise-text";

export interface Option { mode: MeetMode; start?: string; end?: string; place?: string }

const DEFAULT_ORDER: MeetMode[] = ["office", "video", "event"];
const key = (o: Option) => `${o.mode}|${o.start ?? ""}`;
const timeOnly = (local: string) => local.slice(11, 16);
const dayLabel = (local: string) => localSlotLabel(local).split(",")[0];

/**
 * Radio list of the times a talent can pick, grouped by way of meeting. Modes in the talent's own
 * private goal come first; that only orders their own list. `onPick` runs when they confirm.
 */
export function PickTime({
  meetingId, submitLabel = "Book this time", busy, onPick,
}: {
  meetingId: string;
  submitLabel?: string;
  busy?: boolean;
  onPick: (o: Option) => void | Promise<void>;
}) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [mine, setMine] = useState<MeetMode[]>([]);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [o, p] = await Promise.all([
          fetch(`/api/meetings/${meetingId}/options`, { cache: "no-store" }),
          fetch("/api/profile", { cache: "no-store" }),
        ]);
        if (!o.ok) throw new Error("Could not load times.");
        const data = (await o.json()) as { options: Option[] };
        const prof = p.ok ? ((await p.json()) as { goal?: { meetModes?: MeetMode[] } | null }) : null;
        if (!alive) return;
        setMine(prof?.goal?.meetModes ?? []);
        setOptions(data.options);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load times.");
      }
    })();
    return () => { alive = false; };
  }, [meetingId]);

  const groups = useMemo(() => {
    const order = [...mine, ...DEFAULT_ORDER.filter((m) => !mine.includes(m))];
    return order
      .map((mode) => ({ mode, items: (options ?? []).filter((o) => o.mode === mode) }))
      .filter((g) => g.items.length > 0);
  }, [options, mine]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!options) return <p className="text-sm text-muted-foreground">Loading times…</p>;
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No times are open right now. The company hasn&apos;t added free windows yet. Check back soon: this page updates by itself.
      </p>
    );
  }
  const selected = options.find((o) => key(o) === choice);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); if (selected) void onPick(selected); }}
    >
      {groups.map((g) => {
        const days = [...new Set(g.items.map((o) => (o.start ? o.start.slice(0, 10) : "")))];
        return (
          <fieldset key={g.mode} className="space-y-2">
            <legend className="text-sm font-semibold">{MEET_MODE_LABEL[g.mode]}</legend>
            {g.mode === "event" ? (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
                <input type="radio" name="slot" className="mt-1 size-4" checked={choice === key(g.items[0])} onChange={() => setChoice(key(g.items[0]))} />
                <span>A 10-minute slot at the company&apos;s table on the event day. Your time is set for you and shown under Meetings.</span>
              </label>
            ) : (
              days.map((d) => (
                <div key={d}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{dayLabel(`${d}T00:00:00`)}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {g.items.filter((o) => o.start?.startsWith(d)).map((o) => (
                      <label key={key(o)} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:font-semibold has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
                        <input type="radio" name="slot" className="size-4" checked={choice === key(o)} onChange={() => setChoice(key(o))} />
                        <span>{timeOnly(o.start!)}–{timeOnly(o.end!)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </fieldset>
        );
      })}
      <Button type="submit" className="min-h-12 w-full text-base sm:w-auto" disabled={!selected || busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
