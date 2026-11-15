"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ThreadView } from "@/lib/thread";
import { eventDay } from "@/lib/events";
import { outcomeText, PAY_SUBSIDY_URL } from "@/lib/follow-up";
import { NEXT_STEP_KINDS, NEXT_STEP_LABEL, NEXT_STEP_NOTE_MAX, OUTCOME_REASONS, type NextStepKind } from "@/lib/types";

type FollowUp = NonNullable<ThreadView["followUp"]>;

const PHRASE: Record<NextStepKind, string> = { interview: "an interview", trial: "a trial day", offer: "an offer", other: "a next step" };
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

async function errorOf(res: Response | null): Promise<string> {
  if (!res) return "That didn't work. Please try again.";
  const j = (await res.json().catch(() => null)) as { error?: string } | null;
  return j?.error ?? "That didn't work. Please try again.";
}

/** POST to a meeting route; returns an error message or "" on success. */
async function post(meetingId: string, path: "next-step" | "outcome", body: unknown): Promise<string> {
  const res = await fetch(`/api/meetings/${meetingId}/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).catch(() => null);
  return res?.ok ? "" : await errorOf(res);
}

const fieldClass = "mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring";

function PlanDialog({ f, open, onOpenChange, onDone }: { f: FollowUp; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [kind, setKind] = useState<NextStepKind>(f.plan?.kind ?? "interview");
  const [by, setBy] = useState(f.plan?.by && f.plan.by >= f.window.min ? f.plan.by : "");
  const [note, setNote] = useState(f.plan?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    const err = await post(f.meetingId, "next-step", { kind, by, note });
    setBusy(false);
    if (err) return setError(err);
    toast.success(f.plan ? "Plan changed. They are told." : "Next step planned. They are told.");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.plan ? "Change the plan" : "Plan the next step"}</DialogTitle>
          <DialogDescription>They are told what happens next and the date you promise to be in touch by.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">What happens next</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {NEXT_STEP_KINDS.map((k) => (
                <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
                  <input type="radio" name={`kind-${f.meetingId}`} value={k} checked={kind === k} onChange={() => setKind(k)} className="size-4 accent-primary" />
                  {NEXT_STEP_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={`by-${f.meetingId}`} className="text-sm font-medium">Be in touch by</label>
            <Input id={`by-${f.meetingId}`} type="date" min={f.window.min} max={f.window.max} value={by} onChange={(e) => setBy(e.target.value)} className="mt-1 min-h-11" />
            <p className="mt-1 text-xs text-muted-foreground">Between {eventDay(f.window.min)} and {eventDay(f.window.max)}.</p>
          </div>
          <div>
            <label htmlFor={`note-${f.meetingId}`} className="text-sm font-medium">Note for them <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id={`note-${f.meetingId}`} value={note} maxLength={NEXT_STEP_NOTE_MAX} onChange={(e) => setNote(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">{note.length}/{NEXT_STEP_NOTE_MAX}</p>
          </div>
          <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="min-h-11" disabled={!by || busy} onClick={submit}>{f.plan ? "Save plan" : "Plan it"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RecordKind = "hired" | "still_talking" | "not_this_time";
const RECORD_LABEL: Record<RecordKind, string> = { hired: "Hired", still_talking: "Still talking", not_this_time: "Not this time" };

function RecordDialog({ f, open, onOpenChange, onDone }: { f: FollowUp; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [kind, setKind] = useState<RecordKind | "">("");
  const [by, setBy] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = kind === "hired" || (kind === "still_talking" && !!by) || (kind === "not_this_time" && !!reason);

  async function submit() {
    setBusy(true);
    setError("");
    const err = await post(f.meetingId, "outcome", { kind, ...(kind === "still_talking" ? { by } : {}), ...(kind === "not_this_time" ? { reason } : {}) });
    setBusy(false);
    if (err) return setError(err);
    toast.success("Saved. They are told.");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How did it go?</DialogTitle>
          <DialogDescription>You choose. Nothing is worked out for you, and they are told your choice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset>
            <legend className="sr-only">Outcome</legend>
            <div className="space-y-2">
              {(Object.keys(RECORD_LABEL) as RecordKind[]).map((k) => (
                <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring">
                  <input type="radio" name={`outcome-${f.meetingId}`} value={k} checked={kind === k} onChange={() => setKind(k)} className="size-4 accent-primary" />
                  {RECORD_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          {kind === "still_talking" && (
            <div>
              <label htmlFor={`newby-${f.meetingId}`} className="text-sm font-medium">New date to be in touch by</label>
              <Input id={`newby-${f.meetingId}`} type="date" min={f.window.min} max={f.window.max} value={by} onChange={(e) => setBy(e.target.value)} className="mt-1 min-h-11" />
            </div>
          )}
          {kind === "not_this_time" && (
            <div>
              <label htmlFor={`why-${f.meetingId}`} className="text-sm font-medium">Reason</label>
              <select id={`why-${f.meetingId}`} value={reason} onChange={(e) => setReason(e.target.value)} className={fieldClass}>
                <option value="">Choose a reason…</option>
                {OUTCOME_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="min-h-11" disabled={!ready || busy} onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ f, company, open, onOpenChange, onDone }: { f: FollowUp; company: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    const err = await post(f.meetingId, "outcome", { kind: "talent_withdrew" });
    setBusy(false);
    if (err) return setError(err);
    toast.success(`${company} is told you took another job.`);
    onOpenChange(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tell {company} you took another job?</DialogTitle>
          <DialogDescription>They see only that you took another job. This closes the next step and can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <p role="alert" aria-live="assertive" className="text-sm text-destructive">{error}</p>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Keep waiting</Button>
          <Button className="min-h-11" disabled={busy} onClick={submit}>I&apos;ve taken another job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NextStepSection({
  followUp: f, viewer, company, onChanged,
}: {
  followUp: FollowUp;
  viewer: "talent" | "company";
  company: string;
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"plan" | "record" | "withdraw" | null>(null);
  const close = (o: boolean) => { if (!o) setDialog(null); };
  const done = async () => { await onChanged(); router.refresh(); };
  const plan = f.plan;
  const overdue = f.state === "overdue";
  const open = f.state === "planned" || f.state === "still_talking" || overdue;
  const date = plan ? eventDay(plan.by) : "";

  let line: string | null = null;
  if (f.state === "done" && f.outcome) line = outcomeText(f.outcome as Parameters<typeof outcomeText>[0], viewer);
  else if (plan && viewer === "company") {
    line = overdue
      ? `You are ${days(f.daysOver)} past your next-step date of ${date}.`
      : f.state === "still_talking" ? `Still talking. Next contact by ${date}.` : `${NEXT_STEP_LABEL[plan.kind]} by ${date}`;
  } else if (plan) {
    line = overdue
      ? `${company} is ${days(f.daysOver)} past its next-step date of ${date}. You can keep waiting or tell them you took another job.`
      : f.state === "still_talking" ? `${company} says you are still talking. Next contact by ${date}.` : `${company} will contact you about ${PHRASE[plan.kind]} by ${date}.`;
  }

  return (
    <section className="space-y-2 rounded-lg border bg-card p-3 text-sm" aria-labelledby="thread-next-step">
      <h3 id="thread-next-step" className="flex items-center gap-2 font-semibold">
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        Next step
      </h3>

      {f.state === "none" && (
        <p className="text-muted-foreground">
          {viewer === "company" ? "You both want a next step. Say what happens next and by when." : `You both want a next step. ${company} will say what happens next and by when.`}
        </p>
      )}

      {line && (
        <p className="flex items-start gap-2 font-medium">
          {overdue ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            : f.state === "done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              : <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span>{overdue && <span className="text-destructive">Overdue · </span>}{line}</span>
        </p>
      )}
      {plan?.note && f.state !== "done" && <p className="border-l-2 border-primary pl-3 text-muted-foreground">“{plan.note}”</p>}

      {viewer === "company" && f.state === "done" && f.outcome?.kind === "hired" && (
        <p className="text-muted-foreground">
          You may be eligible for a pay subsidy or the Espoo supplement.{" "}
          <a className="inline-flex items-center gap-1 text-primary underline underline-offset-2" href={PAY_SUBSIDY_URL} target="_blank" rel="noreferrer">
            Read more on espoo.fi<ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {viewer === "company" && f.state === "none" && <Button className="min-h-11" onClick={() => setDialog("plan")}>Plan the next step</Button>}
        {viewer === "company" && open && (
          <>
            <Button className="min-h-11" onClick={() => setDialog("record")}>Record how it went</Button>
            <Button variant="outline" className="min-h-11" onClick={() => setDialog("plan")}>Change plan</Button>
          </>
        )}
        {viewer === "talent" && (open || f.state === "none") && (
          <Button variant="outline" className="min-h-11" onClick={() => setDialog("withdraw")}>I&apos;ve taken another job</Button>
        )}
      </div>

      {dialog === "plan" && <PlanDialog f={f} open onOpenChange={close} onDone={done} />}
      {dialog === "record" && <RecordDialog f={f} open onOpenChange={close} onDone={done} />}
      {dialog === "withdraw" && <WithdrawDialog f={f} company={company} open onOpenChange={close} onDone={done} />}
    </section>
  );
}
