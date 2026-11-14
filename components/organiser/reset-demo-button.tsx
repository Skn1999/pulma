"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function onReset() {
    if (!window.confirm("Reset all demo data to the seed? Cards, responses, shortlists and meetings will be removed.")) {
      return;
    }
    setMessage(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
      setMessage("Demo data reset.");
      startTransition(() => router.refresh());
    } catch {
      setMessage("Could not reset the demo data. Try again.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button type="button" variant="outline" onClick={onReset} disabled={pending}>
        {pending ? "Refreshing…" : "Reset demo data"}
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
