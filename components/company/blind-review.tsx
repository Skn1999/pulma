"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlindResponse } from "@/lib/types";
import { AiLabel } from "@/components/ai-label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ReviewMeta {
  shortlistId: string;
  revealedName?: string;
}

const MAX = 5;
const STATUS_LABEL = { invited: "Invited", accepted: "Accepted", declined: "Declined" } as const;

export function BlindReview({ cardId, initialMeta }: { cardId: string; initialMeta: Record<string, ReviewMeta> }) {
  const [items, setItems] = useState<BlindResponse[] | null>(null);
  const [meta, setMeta] = useState(initialMeta);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/responses`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      setError("Couldn't load the responses. Please refresh the page.");
    }
  }, [cardId]);

  useEffect(() => {
    fetch(`/api/cards/${cardId}/responses`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: BlindResponse[]) => setItems(data))
      .catch(() => setError("Couldn't load the responses. Please refresh the page."));
  }, [cardId]);

  const count = items?.filter((i) => i.shortlist).length ?? 0;
  const full = count >= MAX;

  async function toggle(r: BlindResponse) {
    setError(null);
    setBusy(r.id);
    try {
      if (r.shortlist) {
        const sid = meta[r.id]?.shortlistId;
        const res = await fetch(`/api/shortlists/${sid}`, { method: "DELETE" });
        if (res.status === 409) setError("This person has already accepted, so the shortlist can't be undone.");
        else if (!res.ok) setError("Couldn't remove from shortlist. Try again.");
        else setItems((p) => p && p.map((x) => (x.id === r.id ? { ...x, shortlist: undefined } : x)));
      } else {
        const res = await fetch("/api/shortlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, responseId: r.id }),
        });
        if (res.status === 409) {
          setError("You can shortlist at most 5 responses per card.");
          await load();
        } else if (!res.ok) setError("Couldn't shortlist. Try again.");
        else {
          const s = await res.json();
          setMeta((m) => ({ ...m, [r.id]: { shortlistId: s.id } }));
          setItems((p) => p && p.map((x) => (x.id === r.id ? { ...x, shortlist: { status: s.status, note: s.note } } : x)));
        }
      }
    } catch {
      setError("Network problem. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function saveNote(r: BlindResponse, note: string) {
    const sid = meta[r.id]?.shortlistId;
    if (!sid || note.trim() === (r.shortlist?.note ?? "")) return;
    const res = await fetch(`/api/shortlists/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (res.ok) setItems((p) => p && p.map((x) => (x.id === r.id && x.shortlist ? { ...x, shortlist: { ...x.shortlist, note: note.trim() || undefined } } : x)));
    else setError("Couldn't save the note.");
  }

  return (
    <section className="mt-8" aria-labelledby="review-h">
      <h2 id="review-h" className="font-display text-2xl font-semibold">
        Responses
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Answers in random order. No names, photos or CVs — you&apos;re choosing based on how people think.
      </p>

      <div className="sticky top-0 z-10 -mx-2 mt-4 rounded-md border border-border bg-background/95 px-4 py-2 backdrop-blur">
        <p aria-live="polite" className="text-sm font-medium">
          {count} of {MAX} shortlisted
          {full && <span className="ml-2 font-normal text-muted-foreground">Limit reached. Remove one to shortlist another.</span>}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {items === null && !error && <p className="mt-6 text-muted-foreground">Loading responses…</p>}
      {items?.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-border p-6 text-muted-foreground">
          No responses yet. Talent can answer from the browse page; they&apos;ll appear here without names.
        </p>
      )}

      <ol className="mt-4 space-y-4">
        {items?.map((r) => {
          const sl = r.shortlist;
          const name = meta[r.id]?.revealedName;
          const disabled = busy === r.id || (!sl && full) || (sl?.status === "accepted");
          return (
            <li key={r.id}>
              <article aria-labelledby={`h-${r.id}`} className="rounded-md border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id={`h-${r.id}`} className="font-display text-lg font-semibold">
                    Response #{r.publicCode}
                  </h3>
                  {r.aiAssisted && <AiLabel />}
                  {sl && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                      Status: {STATUS_LABEL[sl.status]}
                    </span>
                  )}
                  {sl?.status === "accepted" && name && (
                    <span className="text-sm font-medium">Identity shared: {name}</span>
                  )}
                </div>

                {r.translatedText ? (
                  <>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Translated from {r.originalLanguage}
                    </p>
                    <p className="mt-1 whitespace-pre-line leading-7">{r.translatedText}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm underline underline-offset-4">Show original</summary>
                      <p lang="und" className="mt-2 whitespace-pre-line border-l-2 border-border pl-3 leading-7 text-muted-foreground">
                        {r.text}
                      </p>
                    </details>
                  </>
                ) : (
                  <p className="mt-3 whitespace-pre-line leading-7">{r.text}</p>
                )}

                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <Button
                    variant={sl ? "default" : "outline"}
                    aria-pressed={!!sl}
                    disabled={disabled}
                    onClick={() => toggle(r)}
                    aria-describedby={!sl && full ? "limit-note" : undefined}
                  >
                    {sl ? "Shortlisted ✓" : "Shortlist"}
                  </Button>
                  {!sl && full && (
                    <span id="limit-note" className="self-center text-sm text-muted-foreground">
                      You&apos;ve shortlisted 5. Un-shortlist one first.
                    </span>
                  )}
                </div>

                {sl && (
                  <div className="mt-4">
                    <label htmlFor={`note-${r.id}`} className="text-sm font-medium">
                      Private note <span className="font-normal text-muted-foreground">(Only your team sees this)</span>
                    </label>
                    <Textarea
                      id={`note-${r.id}`}
                      className="mt-1"
                      rows={2}
                      defaultValue={sl.note ?? ""}
                      onBlur={(e) => saveNote(r, e.target.value)}
                    />
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
