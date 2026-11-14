"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle, Lock, LockOpen, MinusCircle } from "lucide-react";
import type { ThreadView } from "@/lib/thread";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki" }).format(new Date(iso));
}

export function MatchThread({ responseId, viewer = "talent" }: { responseId: string; viewer?: "talent" | "company" }) {
  const [t, setT] = useState<ThreadView | null>(null);
  const [error, setError] = useState("");
  const [announce, setAnnounce] = useState("");
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    seen.current = null;
    async function load() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/thread/${responseId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "This thread is no longer available." : "Could not load the thread.");
        const data = (await res.json()) as ThreadView;
        if (!alive) return;
        if (seen.current) {
          const fresh = data.events.filter((e) => !seen.current!.has(e.id) && !e.byMe);
          if (fresh.length) setAnnounce(fresh.map((e) => e.text).join(". "));
        }
        seen.current = new Set(data.events.map((e) => e.id));
        setT(data);
        setError("");
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not load the thread.");
      }
    }
    load();
    const id = setInterval(load, 5000);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [responseId]);

  if (error && !t) return <p role="alert" className="text-sm text-muted-foreground">{error}</p>;
  if (!t) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const other = viewer === "company" ? "They" : t.card.companyName;
  return (
    <div className="space-y-5">
      <div aria-live="polite" className="sr-only">{announce}</div>

      <section aria-labelledby="thread-steps">
        <h3 id="thread-steps" className="sr-only">Progress</h3>
        <ol className="flex gap-1 overflow-x-auto">
          {t.steps.map((s) => (
            <li
              key={s.key}
              aria-current={s.state === "current" ? "step" : undefined}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-md border px-1 py-1.5 text-center text-[0.7rem] leading-tight ${
                s.state === "current" ? "border-primary bg-accent font-semibold text-accent-foreground" : s.state === "done" ? "border-border bg-muted" : "border-dashed border-border text-muted-foreground"
              }`}
            >
              {s.state === "done" ? <Check className="size-4" aria-hidden="true" /> : s.state === "skipped" ? <MinusCircle className="size-4" aria-hidden="true" /> : <Circle className="size-4" aria-hidden="true" />}
              <span>{s.label}</span>
              <span className="sr-only">{s.state === "done" ? "(done)" : s.state === "current" ? "(current)" : s.state === "skipped" ? "(skipped)" : "(not yet)"}</span>
            </li>
          ))}
        </ol>
      </section>

      {t.message && (
        <figure className="border-l-2 border-primary pl-3">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {viewer === "company" ? "Your message" : "Why they'd like to talk"}
          </figcaption>
          <blockquote className="mt-1 text-sm leading-6">“{t.message}”</blockquote>
          {viewer === "talent" && <p className="mt-1 text-xs text-muted-foreground">— {t.card.companyName}</p>}
        </figure>
      )}

      {t.stage === "closed" && (
        <section className="rounded-lg border bg-muted/60 p-3" aria-labelledby="thread-closed">
          <h3 id="thread-closed" className="text-sm font-semibold">Not this time</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewer === "company" ? "You closed this answer." : `${t.card.companyName} won't take this answer forward right now.`}
            {t.closedReason ? ` ${t.closedReason}.` : ""}
          </p>
        </section>
      )}

      {t.meeting && (
        <section className="rounded-lg border border-primary/40 bg-accent p-3" aria-labelledby="thread-meeting">
          <h3 id="thread-meeting" className="text-sm font-semibold">Meeting booked</h3>
          <p className="mt-1 text-sm">
            Table {t.meeting.table} · {fmt(t.meeting.start)}
            {t.counterpartName ? ` · with ${t.counterpartName}` : ""}
          </p>
        </section>
      )}

      <section aria-labelledby="thread-privacy">
        <h3 id="thread-privacy" className="text-sm font-semibold">What stays private</h3>
        <ul className="mt-2 space-y-1.5">
          {t.privacy.map((p) => (
            <li key={p.label} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm">
              {p.unlocked ? <LockOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>
                <span className="font-medium">{p.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.unlocked
                    ? `Shared with ${p.hiddenFrom === "company" ? (viewer === "company" ? "you" : t.card.companyName) : "them"} — ${viewer === "company" ? "they" : "you"} ${p.label.includes("email") ? "both chose a next step" : "accepted"}`
                    : p.label === "Your name" || p.label === "Your email"
                      ? `Hidden from ${t.card.companyName} — ${p.unlockHint.charAt(0).toLowerCase()}${p.unlockHint.slice(1)}`
                      : `Hidden — ${p.unlockHint.charAt(0).toLowerCase()}${p.unlockHint.slice(1)}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="thread-events">
        <h3 id="thread-events" className="text-sm font-semibold">What happened</h3>
        {t.events.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{other === "They" ? "Nothing yet." : `Nothing yet from ${other}.`}</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {t.events.map((e) => (
              <li key={e.id} className={`flex gap-2 text-sm ${e.byMe ? "text-muted-foreground" : "font-medium"}`}>
                <time dateTime={e.at} className="w-24 shrink-0 text-xs text-muted-foreground">{fmt(e.at)}</time>
                <span>{e.byMe ? "You: " : ""}{e.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
