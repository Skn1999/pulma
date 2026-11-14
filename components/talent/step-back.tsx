"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2, UserRoundMinus } from "lucide-react";
import { shortDate } from "@/lib/next-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** What the company will see when someone steps back. The reason is never asked for, sent or stored. */
export function steppedBackPreview(code: string, until?: string): string {
  return `#${code} stepped back${until ? `, available again from ${shortDate(until)}` : ""}`;
}

export function StepBack({
  responseId, code, companyName, minDate, steppedBack,
}: {
  responseId: string;
  code: string;
  companyName: string;
  minDate: string; // earliest allowed "available again" date, YYYY-MM-DD
  steppedBack?: { until?: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dateId = `until-${responseId}`;

  async function call(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/responses/${responseId}/step-back`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(until ? { until } : {}) : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't work. Please try again.");
      if (method === "DELETE") toast.error(msg ?? "Couldn't undo. Try again.");
      return;
    }
    toast.success(method === "POST" ? `You stepped back from #${code}` : `You're back in for #${code}`);
    setOpen(false);
    router.refresh();
  }

  if (steppedBack) {
    return (
      <div className="mt-3 rounded-lg border bg-muted/50 p-3">
        <p className="flex items-start gap-1.5 text-sm font-medium">
          <UserRoundMinus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{steppedBackPreview(code, steppedBack.until)}. {companyName} sees exactly this.</span>
        </p>
        <Button type="button" variant="outline" className="mt-2 min-h-11 gap-1.5 px-4 text-sm" disabled={busy} onClick={() => void call("DELETE")}>
          <Undo2 className="size-4" aria-hidden="true" /> Undo
        </Button>
        {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 gap-1.5 px-4 text-sm"
        onClick={() => { setUntil(""); setError(""); setOpen(true); }}
      >
        <UserRoundMinus className="size-4" aria-hidden="true" /> Step back from this one
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Step back from #{code}?</DialogTitle>
            <DialogDescription>
              Your answer stays, but {companyName} can no longer shortlist it. An open invite is declined and a meeting is cancelled. You can undo this.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor={dateId} className="text-sm font-medium">
              Available again from <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id={dateId} type="date" className="mt-1 min-h-11" min={minDate} value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">What {companyName} will see</p>
            <p className="mt-1">{steppedBackPreview(code, until || undefined)}</p>
            <p className="mt-2 text-muted-foreground">Your reason is never shared or stored. We don&apos;t ask for one.</p>
          </div>
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Keep my answer active</Button>
            <Button className="min-h-11" disabled={busy} onClick={() => void call("POST")}>{busy ? "Saving…" : "Step back"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
