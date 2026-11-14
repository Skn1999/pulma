"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function InviteActions({ shortlistId }: { shortlistId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(accept: boolean) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/shortlists/${shortlistId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setError("That didn't work. Please try again.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11 px-5 text-sm" disabled={busy} onClick={() => respond(true)}>
          Accept and share my name
        </Button>
        <Button variant="outline" className="min-h-11 px-5 text-sm" disabled={busy} onClick={() => respond(false)}>
          Decline
        </Button>
      </div>
      <p role="alert" className="mt-2 text-sm text-destructive">
        {error}
      </p>
    </div>
  );
}
