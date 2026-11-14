"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, FileText, Languages, Sparkles } from "lucide-react";
import type { BlindResponse, Company, ProblemCard } from "@/lib/types";
import { AiLabel } from "@/components/ai-label";
import { ProblemCardView } from "@/components/problem-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ReviewMeta {
  shortlistId: string;
  revealedName?: string;
}

const MAX = 5;
const STATUS_LABEL = { invited: "Invited", accepted: "Accepted", declined: "Declined" } as const;
type Tab = "all" | "shortlisted" | "accepted";

function firstLine(r: BlindResponse) {
  const t = (r.translatedText ?? r.text).trim().split("\n")[0];
  return t.length > 90 ? t.slice(0, 90) + "…" : t;
}

export function TriageView({
  card, company, initialMeta,
}: {
  card: ProblemCard;
  company?: Company;
  initialMeta: Record<string, ReviewMeta>;
}) {
  const cardId = card.id;
  const [items, setItems] = useState<BlindResponse[] | null>(null);
  const [meta, setMeta] = useState(initialMeta);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [cardOpen, setCardOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/responses`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setItems(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
      toast.error("Couldn't load the answers. Please refresh the page.");
    }
  }, [cardId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const count = items?.filter((i) => i.shortlist).length ?? 0;
  const full = count >= MAX;
  const accepted = items?.filter((i) => i.shortlist?.status === "accepted").length ?? 0;

  // Server order is kept as-is. Tabs only filter by the company's own shortlist status.
  const visible = useMemo(() => {
    if (!items) return [];
    if (tab === "shortlisted") return items.filter((i) => i.shortlist);
    if (tab === "accepted") return items.filter((i) => i.shortlist?.status === "accepted");
    return items;
  }, [items, tab]);

  const selected = visible.find((i) => i.id === selectedId) ?? (mobileOpen ? null : visible[0] ?? null);
  const selId = selected?.id ?? null;

  const toggle = useCallback(
    async (r: BlindResponse) => {
      setBusy(r.id);
      try {
        if (r.shortlist) {
          const sid = meta[r.id]?.shortlistId;
          const res = await fetch(`/api/shortlists/${sid}`, { method: "DELETE" });
          if (res.status === 409) toast.error("This person has already accepted, so the shortlist can't be undone.");
          else if (!res.ok) toast.error("Couldn't remove from the shortlist. Try again.");
          else {
            setItems((p) => p && p.map((x) => (x.id === r.id ? { ...x, shortlist: undefined } : x)));
            toast(`Response #${r.publicCode} removed from shortlist`);
          }
        } else {
          const res = await fetch("/api/shortlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardId, responseId: r.id }),
          });
          if (res.status === 409) {
            toast.error("You can shortlist at most 5 answers per problem. Remove one first.");
            await load();
          } else if (!res.ok) toast.error("Couldn't shortlist. Try again.");
          else {
            const s = await res.json();
            setMeta((m) => ({ ...m, [r.id]: { shortlistId: s.id } }));
            setItems((p) => p && p.map((x) => (x.id === r.id ? { ...x, shortlist: { status: s.status, note: s.note } } : x)));
            toast.success(`Response #${r.publicCode} shortlisted`);
          }
        }
      } catch {
        toast.error("Network problem. Try again.");
      } finally {
        setBusy(null);
      }
    },
    [cardId, load, meta],
  );

  async function saveNote(r: BlindResponse, note: string) {
    const sid = meta[r.id]?.shortlistId;
    if (!sid || note.trim() === (r.shortlist?.note ?? "")) return;
    try {
      const res = await fetch(`/api/shortlists/${sid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error();
      setItems((p) =>
        p && p.map((x) => (x.id === r.id && x.shortlist ? { ...x, shortlist: { ...x.shortlist, note: note.trim() || undefined } } : x)),
      );
      toast.success("Note saved");
    } catch {
      toast.error("Couldn't save the note.");
    }
  }

  const move = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const i = Math.max(0, visible.findIndex((v) => v.id === selId));
      const next = visible[Math.min(visible.length - 1, Math.max(0, i + delta))];
      setSelectedId(next.id);
      requestAnimationFrame(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
      });
    },
    [visible, selId],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      if (t?.closest("[role=dialog]")) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "s" && selected && busy === null) {
        if (selected.shortlist?.status === "accepted") return;
        if (!selected.shortlist && full) {
          toast.error("You've shortlisted 5. Remove one to shortlist another.");
          return;
        }
        e.preventDefault();
        void toggle(selected);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, selected, busy, full, toggle]);

  const counts = { all: items?.length ?? 0, shortlisted: count, accepted };
  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "accepted", label: "Accepted" },
  ];

  function onTabKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[n].key);
    setSelectedId(null);
    (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-2rem-2px)]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link href="/company" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            All problems
          </Link>
          <h1 className="truncate font-display text-xl font-semibold">{card.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCardOpen(true)}>
            <FileText aria-hidden="true" /> View problem card
          </Button>
          <Link href="/event?company=me" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <CalendarDays aria-hidden="true" /> Event day
          </Link>
        </div>
      </header>

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Problem card</DialogTitle>
            <DialogDescription>This is what talent sees.</DialogDescription>
          </DialogHeader>
          <ProblemCardView card={card} company={company} />
        </DialogContent>
      </Dialog>

      <div role="tablist" aria-label="Filter answers" className="flex gap-1 border-b px-4 pt-2 sm:px-6">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="triage-panel"
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => {
              setTab(t.key);
              setSelectedId(null);
              setMobileOpen(false);
            }}
            onKeyDown={(e) => onTabKey(e, i)}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.key ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      <div id="triage-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex min-h-0 flex-1">
        {/* List pane */}
        <div className={cn("flex min-h-0 w-full flex-col md:w-80 md:shrink-0 md:border-r", mobileOpen && "hidden md:flex")}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items === null && !loadError && <p className="p-4 text-sm text-muted-foreground">Loading answers…</p>}
            {loadError && (
              <div className="p-4 text-sm">
                <p className="text-destructive">Couldn&apos;t load the answers.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>Try again</Button>
              </div>
            )}
            {items !== null && visible.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                {tab === "all"
                  ? "No answers yet. When talent respond, they appear here without names."
                  : tab === "shortlisted"
                    ? "Nobody shortlisted yet. Select an answer and press Shortlist."
                    : "Nobody has accepted yet. Names appear here once they do."}
              </p>
            )}
            <ul ref={listRef} aria-label="Anonymous answers">
              {visible.map((r) => {
                const sl = r.shortlist;
                const isSel = r.id === selId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      data-id={r.id}
                      aria-current={isSel ? "true" : undefined}
                      onClick={() => {
                        setSelectedId(r.id);
                        setMobileOpen(true);
                      }}
                      className={cn(
                        "block w-full border-b border-l-2 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        isSel ? "border-l-primary bg-accent/60" : "border-l-transparent hover:bg-muted/60",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Response #{r.publicCode}</span>
                        {r.aiAssisted && (
                          <span title="AI-assisted wording">
                            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                            <span className="sr-only">AI-assisted wording</span>
                          </span>
                        )}
                        {r.translatedText && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Languages className="size-3" aria-hidden="true" /> Translated
                          </span>
                        )}
                        {sl && (
                          <span className="ml-auto rounded-full border px-1.5 text-[11px] font-medium">
                            {STATUS_LABEL[sl.status]}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{firstLine(r)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="hidden border-t px-4 py-2 text-xs text-muted-foreground md:block">
            Keyboard: <kbd className="rounded border px-1">j</kbd> <kbd className="rounded border px-1">k</kbd>{" "}
            <kbd className="rounded border px-1">s</kbd>
          </p>
        </div>

        {/* Reading pane */}
        <section
          aria-label="Selected answer"
          className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", !mobileOpen && "hidden md:block")}
        >
          {selected ? (
            <Reader
              r={selected}
              name={meta[selected.id]?.revealedName}
              full={full}
              busy={busy === selected.id}
              showOriginal={!!showOriginal[selected.id]}
              onShowOriginal={(v) => setShowOriginal((s) => ({ ...s, [selected.id]: v }))}
              onToggle={() => void toggle(selected)}
              onNote={(n) => void saveNote(selected, n)}
              onBack={() => setMobileOpen(false)}
            />
          ) : (
            <p className="p-8 text-sm text-muted-foreground">Select an answer to read it.</p>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/40 px-4 py-2.5 text-sm sm:px-6">
        <p aria-live="polite" className="font-medium">
          {count} of {MAX} shortlisted
        </p>
        {full && (
          <p className="text-muted-foreground">
            Limit reached: five per problem keeps 10-minute meetings meaningful. Remove one to shortlist another.
          </p>
        )}
        {!full && <p className="text-muted-foreground">Answers are in random order. A person, not an algorithm, chooses.</p>}
      </div>
    </div>
  );
}

function Reader({
  r, name, full, busy, showOriginal, onShowOriginal, onToggle, onNote, onBack,
}: {
  r: BlindResponse;
  name?: string;
  full: boolean;
  busy: boolean;
  showOriginal: boolean;
  onShowOriginal: (v: boolean) => void;
  onToggle: () => void;
  onNote: (n: string) => void;
  onBack: () => void;
}) {
  const sl = r.shortlist;
  const locked = sl?.status === "accepted";
  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-8">
      <Button variant="ghost" size="sm" className="mb-3 md:hidden" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Back to answers
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold">Response #{r.publicCode}</h2>
        {r.aiAssisted && <AiLabel />}
        {sl && <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">Status: {STATUS_LABEL[sl.status]}</span>}
      </div>
      {locked && name && <p className="mt-2 text-sm font-medium">Identity shared: {name}</p>}

      {r.translatedText ? (
        <>
          <p className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Translated from {r.originalLanguage}
            <button
              type="button"
              aria-expanded={showOriginal}
              onClick={() => onShowOriginal(!showOriginal)}
              className="rounded text-xs normal-case underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showOriginal ? "Hide original" : "Show original"}
            </button>
          </p>
          <p className="mt-2 whitespace-pre-line leading-7">{r.translatedText}</p>
          {showOriginal && (
            <p className="mt-3 whitespace-pre-line border-l-2 pl-3 leading-7 text-muted-foreground">
              <span className="sr-only">Original text in {r.originalLanguage}: </span>
              {r.text}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 whitespace-pre-line leading-7">{r.text}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
        <Button
          variant={sl ? "default" : "outline"}
          aria-pressed={!!sl}
          disabled={busy || locked || (!sl && full)}
          onClick={onToggle}
        >
          {sl ? "Remove from shortlist" : "Shortlist"}
        </Button>
        {!sl && full && <span className="text-sm text-muted-foreground">Five already shortlisted. Remove one first.</span>}
        {locked && <span className="text-sm text-muted-foreground">Accepted, so it can&apos;t be removed.</span>}
      </div>

      {sl && (
        <div className="mt-5">
          <label htmlFor={`note-${r.id}`} className="text-sm font-medium">
            Private note <span className="font-normal text-muted-foreground">(Only your team sees this)</span>
          </label>
          <Textarea
            key={r.id}
            id={`note-${r.id}`}
            className="mt-1"
            rows={3}
            defaultValue={sl.note ?? ""}
            onBlur={(e) => onNote(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
