"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Briefcase, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { steppedBackPreview } from "./step-back";

export interface ActiveAnswer {
  id: string;
  code: string;
  companyName: string;
}

type Mode = "role" | "away" | null;

/** "My situation changed": step back from all active answers at once. Reasons are never asked for or stored. */
export function SituationChanged({ answers, minDate }: { answers: ActiveAnswer[]; minDate: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveUntil = mode === "away" && until ? until : undefined;
  const none = answers.length === 0;

  async function confirm() {
    if (mode === "away" && !until) {
      setError("Choose the date you're available again.");
      return;
    }
    setBusy(true);
    setError("");
    const results = await Promise.all(
      answers.map((a) =>
        fetch(`/api/responses/${a.id}/step-back`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(effectiveUntil ? { until: effectiveUntil } : {}),
        })
          .then((r) => r.ok)
          .catch(() => false),
      ),
    );
    setBusy(false);
    const failed = results.filter((ok) => !ok).length;
    if (failed > 0) {
      setError(`${failed} of ${answers.length} didn't save. Please try again.`);
      router.refresh();
      return;
    }
    toast.success(answers.length === 1 ? "You stepped back from 1 answer" : `You stepped back from ${answers.length} answers`);
    setMode(null);
    router.refresh();
  }

  return (
    <section aria-labelledby="situation-h" className="rounded-xl border border-border bg-card p-4">
      <h2 id="situation-h" className="font-display text-lg font-semibold">My situation changed</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tell the companies you answered, without giving a reason.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant={mode === "role" ? "default" : "outline"} aria-pressed={mode === "role"} className="min-h-11 justify-start gap-1.5" disabled={none} onClick={() => { setMode("role"); setError(""); }}>
          <Briefcase className="size-4" aria-hidden="true" /> I took another role
        </Button>
        <Button type="button" variant={mode === "away" ? "default" : "outline"} aria-pressed={mode === "away"} className="min-h-11 justify-start gap-1.5" disabled={none} onClick={() => { setMode("away"); setError(""); }}>
          <Hourglass className="size-4" aria-hidden="true" /> I&apos;m not available for a while
        </Button>
        <Link href="/talent/meetings" className="inline-flex min-h-11 items-center justify-start gap-1.5 rounded-lg border border-input bg-background px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring">
          <CalendarClock className="size-4" aria-hidden="true" /> I need to move a meeting
        </Link>
      </div>
      {none && <p className="mt-3 text-sm text-muted-foreground">You have no active answers, so there is nothing to step back from.</p>}

      {mode && !none && (
        <div className="mt-4 space-y-3 border-t pt-4">
          {mode === "away" && (
            <div>
              <label htmlFor="away-until" className="text-sm font-medium">Available again from</label>
              <Input id="away-until" type="date" className="mt-1 min-h-11 max-w-xs" min={minDate} value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          )}
          <div className="text-sm">
            <p className="font-medium">
              What {answers.length === 1 ? "this company" : "these companies"} will see
            </p>
            <ul className="mt-1 space-y-0.5">
              {answers.map((a) => (
                <li key={a.id}>{steppedBackPreview(a.code, effectiveUntil)}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Your reason is never shared or stored. An open invite is declined and a booked meeting is cancelled. You can undo each one from My answers.
            </p>
          </div>
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Saving…" : `Step back from ${answers.length} ${answers.length === 1 ? "answer" : "answers"}`}
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
