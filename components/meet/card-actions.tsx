"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" className="min-h-11 px-4" onClick={() => window.print()}>
      <Printer aria-hidden="true" /> Print this card
    </Button>
  );
}

/** Candidate only: choose up to 3 of their own skills to show on the card. */
export function CardSkillsForm({ meetingId, skills, chosen, max }: { meetingId: string; skills: string[]; chosen: string[]; max: number }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(label: string) {
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : p.length < max ? [...p, label] : p));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/meetings/${meetingId}/card`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: picked }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "That didn't work. Please try again.");
      return;
    }
    toast.success("Card updated");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border bg-background p-4 print:hidden">
      <fieldset>
        <legend className="font-medium">Show up to {max} of your skills on this card</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. The company you meet will see the ones you tick, on this card only. Your other skills stay private.
        </p>
        <ul className="mt-2 space-y-1">
          {skills.map((s) => {
            const on = picked.includes(s);
            const full = !on && picked.length >= max;
            return (
              <li key={s}>
                <label className={`flex min-h-11 items-center gap-3 rounded-md px-2 ${full ? "opacity-60" : "hover:bg-muted"}`}>
                  <input
                    type="checkbox"
                    className="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    checked={on}
                    disabled={full}
                    onChange={() => toggle(s)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{picked.length} of {max} chosen</p>
      </fieldset>
      <p role="alert" className="text-sm text-destructive">{error}</p>
      <Button type="submit" className="min-h-11 px-4" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
    </form>
  );
}
