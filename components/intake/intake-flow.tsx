"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import type { CardDraft, Company, IntakeAnswers, ProblemCard } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageTitle } from "@/components/shell/page-title";
import { Textarea } from "@/components/ui/textarea";
import { ProblemCardView } from "@/components/problem-card";
import { QUESTIONS } from "./questions";
import { DictateButton } from "./dictate-button";
import { CardEditor, splitList, type EditorState } from "./card-editor";

type Stage = "chat" | "generating" | "edit";

function Bubble({ who, children }: { who: "ai" | "me"; children: React.ReactNode }) {
  return (
    <div className={`flex ${who === "me" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.95rem] leading-6 ${
          who === "me"
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border border-border bg-card text-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function IntakeFlow({ company }: { company?: Company }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("chat");
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [step, setStep] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fallback, setFallback] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage === "chat") {
      taRef.current?.focus();
      endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
    if (stage === "edit") previewHeadingRef.current?.focus();
  }, [stage, step]);

  async function generate(all: string[]) {
    setStage("generating");
    setError(null);
    const body: IntakeAnswers = {
      problem: all[0],
      firstWeek: all[1],
      hardPart: all[2],
      bonus: all[3],
      languages: all[4],
    };
    try {
      const res = await fetch("/api/ai/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("bad response");
      const data: { draft: CardDraft; suggestions?: string[]; fallback?: boolean } = await res.json();
      setEditor({
        draft: data.draft,
        niceRaw: data.draft.niceToHave.join(", "),
        langRaw: data.draft.languages.join(", "),
      });
      setSuggestions(data.suggestions ?? []);
      setFallback(!!data.fallback);
      setStage("edit");
    } catch {
      setError("We couldn't build the card just now. Your answers are saved, so you can try again.");
      setStage("chat");
    }
  }

  function send() {
    const v = value.trim();
    if (!v) return;
    const next = [...answers];
    next[step] = v;
    setAnswers(next);
    if (step === QUESTIONS.length - 1) {
      void generate(next);
    } else {
      setStep(step + 1);
      setValue(next[step + 1] ?? "");
    }
  }

  function back() {
    if (step === 0) return;
    const next = [...answers];
    if (value.trim()) next[step] = value.trim();
    setAnswers(next);
    setStep(step - 1);
    setValue(next[step - 1] ?? "");
  }

  async function publish() {
    if (!editor || !editor.draft.title.trim()) return;
    setPublishing(true);
    setError(null);
    try {
      const draft: CardDraft = {
        ...editor.draft,
        niceToHave: splitList(editor.niceRaw),
        languages: splitList(editor.langRaw),
      };
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      if (!res.ok) throw new Error("bad response");
      const card: ProblemCard = await res.json();
      toast.success("Problem card published");
      router.push(`/company/card/${card.id}`);
    } catch {
      setError("Publishing didn't work. Please try again.");
      toast.error("Publishing didn't work. Please try again.");
      setPublishing(false);
    }
  }

  if (stage === "generating") {
    return (
      <Frame step={5}>
        <div className="mx-auto my-auto max-w-xl py-24 text-center" role="status" aria-live="polite">
          <div
            aria-hidden="true"
            className="mx-auto mb-6 size-8 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
          />
          <p className="font-display text-xl">Turning your answers into a problem card…</p>
          <p className="mt-2 text-sm text-muted-foreground">This usually takes a few seconds.</p>
        </div>
      </Frame>
    );
  }

  if (stage === "edit" && editor) {
    return (
      <Frame step={5} scroll>
        <h1 ref={previewHeadingRef} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">
          Check your problem card
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Edit anything. The card describes the work, not the person. Nothing is published until you say so.
          {fallback && <span className="ml-1 text-xs">(Drafted offline.)</span>}
        </p>

        {suggestions.length > 0 && (
          <ul className="mt-6 space-y-2" aria-label="Suggestions about wording">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
                <div>
                  <p className="font-medium">A suggestion about wording</p>
                  <p className="mt-0.5">{s}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuggestions(suggestions.filter((_, j) => j !== i))}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`Dismiss suggestion ${i + 1}`}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <CardEditor state={editor} onChange={setEditor} />
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={publish} disabled={publishing || !editor.draft.title.trim()}>
                {publishing ? "Publishing…" : "Publish card"}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => setStage("chat")}>
                Back to answers
              </Button>
            </div>
          </div>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Live preview</p>
            <ProblemCardView
              card={{ ...editor.draft, niceToHave: splitList(editor.niceRaw), languages: splitList(editor.langRaw) }}
              company={company}
            />
          </div>
        </div>
      </Frame>
    );
  }

  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  return (
    <Frame step={step} composer={
      <div className="border-t bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-2">
          <label htmlFor="answer" className="sr-only">{q.text}</label>
          <Textarea
            id="answer"
            ref={taRef}
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            aria-describedby="answer-hint"
            className="max-h-40 resize-none"
          />
          <p id="answer-hint" className="text-xs text-muted-foreground">
            {q.hint} Enter to send, Shift+Enter for a new line.
          </p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <DictateButton value={value} onChange={setValue} />
            <div className="ml-auto flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={back}>Back</Button>
              )}
              <Button type="button" onClick={send} disabled={!value.trim()}>
                {last ? "Create my card" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    }>
      <div className="mx-auto mt-auto w-full max-w-2xl space-y-3" role="log" aria-label="Conversation">
        <Bubble who="ai">
          Hi! Five short questions, and I&apos;ll turn your answers into a problem card that talent can respond to.
        </Bubble>
        {QUESTIONS.slice(0, step).map((qq, i) => (
          <div key={qq.key} className="space-y-3">
            <Bubble who="ai">{qq.text}</Bubble>
            <Bubble who="me">{answers[i]}</Bubble>
          </div>
        ))}
        <Bubble who="ai">{q.text}</Bubble>
        <div ref={endRef} />
      </div>
    </Frame>
  );
}

function Frame({
  step, children, composer, scroll,
}: {
  step?: number;
  children: React.ReactNode;
  composer?: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-2rem-2px)]">
      <PageTitle
        title="New problem"
        actions={
          <Link href="/company" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Cancel
          </Link>
        }
      />
      {step !== undefined && (
        <ol aria-label="Progress" className="flex items-center justify-center gap-2 border-b px-4 py-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <li
              key={n}
              aria-current={n === step ? "step" : undefined}
              className={`flex size-6 items-center justify-center rounded-full border text-xs ${
                n < step ? "border-primary bg-primary text-primary-foreground" : n === step ? "border-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <span className="sr-only">{n < step ? "Done: question " : n === step ? "Current: question " : "Question "}</span>
              {n + 1}
            </li>
          ))}
        </ol>
      )}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6`}>
        {scroll ? <div className="mx-auto w-full max-w-5xl">{children}</div> : children}
      </div>
      {composer}
    </div>
  );
}
