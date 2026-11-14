"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEET_MODES, MEET_MODE_LABEL, type MeetMode, type TalentGoal } from "@/lib/types";

const STATUSES: { value: TalentGoal["status"]; label: string; hint: string }[] = [
  { value: "active", label: "Actively looking", hint: "I want to talk to companies soon." },
  { value: "open", label: "Open to the right thing", hint: "I'm not in a hurry." },
  { value: "exploring", label: "Just exploring", hint: "I'm seeing what problems are out there." },
];

/** The talent's own, private goal. Never sent to a company; it only shapes this screen and the order of your own meeting options. */
export function GoalForm({ initial }: { initial: TalentGoal | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<TalentGoal["status"] | "">(initial?.status ?? "");
  const [from, setFrom] = useState(initial?.availableFrom ?? "");
  const [modes, setModes] = useState<MeetMode[]>(initial?.meetModes ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(goal: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
      setError(msg ?? "That didn't save. Please try again.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!status) {
      setError("Choose where you are right now.");
      return;
    }
    if (await save({ status, availableFrom: from || undefined, meetModes: modes })) toast.success("Goal saved. Only you can see it.");
  }

  async function onClear() {
    if (await save(null)) {
      setStatus("");
      setFrom("");
      setModes([]);
      toast("Goal cleared");
    }
  }

  const toggle = (m: MeetMode) => setModes((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  return (
    <section id="goal" aria-labelledby="goal-h" className="scroll-mt-20 rounded-xl border border-border bg-card p-4">
      <h2 id="goal-h" className="font-display text-lg font-semibold">Your goal</h2>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Only you see this. Companies never see it, and it never changes who sees your answers.
      </p>

      <form onSubmit={onSave} className="mt-4 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium">Where are you right now?</legend>
          <div className="mt-2 space-y-2">
            {STATUSES.map((s) => (
              <label key={s.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <input
                  type="radio"
                  name="goal-status"
                  value={s.value}
                  checked={status === s.value}
                  onChange={() => setStatus(s.value)}
                  className="mt-1 size-4 accent-[var(--primary)]"
                />
                <span className="text-sm">
                  <span className="block font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="goal-from" className="text-sm font-medium">
            Available from <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input id="goal-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-48" />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">
            Ways you are happy to meet <span className="font-normal text-muted-foreground">(none ticked means any)</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEET_MODES.map((m) => (
              <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                <input type="checkbox" checked={modes.includes(m)} onChange={() => toggle(m)} className="size-4 accent-[var(--primary)]" />
                {MEET_MODE_LABEL[m]}
              </label>
            ))}
          </div>
        </fieldset>

        <p role="alert" className="text-sm text-destructive">{error}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-11 px-5" disabled={busy}>{busy ? "Saving…" : "Save goal"}</Button>
          {initial && (
            <Button type="button" variant="outline" className="min-h-11 px-5" disabled={busy} onClick={onClear}>
              Clear goal
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
