"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { steppedBackPreview } from "./step-back";

export interface ActiveAnswer {
  id: string;
  code: string;
  companyName: string;
}

type Mode = "role" | "away" | null;

/**
 * "Took a role, or need a break?": step back from all active answers at once, so companies are not left
 * waiting (the talent side of no ghosting). Reasons are never asked for or stored. Shown only with active answers.
 */
export function SituationChanged({ answers, minDate }: { answers: ActiveAnswer[]; minDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    router.refresh();
  }

  const companies = new Set(answers.map((a) => a.companyName)).size;

  return (
    <section aria-labelledby="situation-h" className="rounded-lg border border-dashed border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 id="situation-h" className="text-sm font-medium">Took a role, or need a break?</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tell the {companies === 1 ? "company" : `${companies} companies`} you answered that you&apos;re stepping back, so nobody is left
            waiting on you. You don&apos;t give a reason.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          aria-expanded={open}
          aria-controls="situation-panel"
          onClick={() => { setOpen((o) => !o); setMode(null); setError(""); }}
        >
          {open ? "Close" : "Let them know"}
        </Button>
      </div>

      {open && (
        <div id="situation-panel" className="mt-3 space-y-3 border-t pt-3">
          <fieldset>
            <legend className="text-sm font-medium">What changed?</legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant={mode === "role" ? "default" : "outline"} aria-pressed={mode === "role"} className="min-h-11 justify-start gap-1.5" onClick={() => { setMode("role"); setError(""); }}>
                <Briefcase className="size-4" aria-hidden="true" /> I took another role
              </Button>
              <Button type="button" variant={mode === "away" ? "default" : "outline"} aria-pressed={mode === "away"} className="min-h-11 justify-start gap-1.5" onClick={() => { setMode("away"); setError(""); }}>
                <Hourglass className="size-4" aria-hidden="true" /> I&apos;m not available for a while
              </Button>
            </div>
          </fieldset>
        </div>
      )}

      {open && mode && !none && (
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
