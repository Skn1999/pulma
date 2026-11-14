"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

/** Save a problem for later. Private to the candidate. Sits outside any link, above a stretched title link. */
export function BookmarkButton({ cardId, saved: initial, className = "" }: { cardId: string; saved: boolean; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const res = await fetch("/api/saved", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, saved: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not save");
      router.refresh();
    } catch (e) {
      setSaved(!next);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      className={`relative z-10 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring ${saved ? "text-primary" : ""} ${className}`}
    >
      <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
