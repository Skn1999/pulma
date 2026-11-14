"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CardDraft, Company, IntakeAnswers, ProblemCard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProblemCardView } from "@/components/problem-card";
import { QUESTIONS } from "./questions";
import { DictateButton } from "./dictate-button";
import { CardEditor, splitList, type EditorState } from "./card-editor";

type Stage = "chat" | "generating" | "edit" | "published";

const linkBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

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

export function IntakeFlow({ companyId, company }: { companyId: string; company?: Company }) {
  const [stage, setStage] = useState<Stage>("chat");
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [step, setStep] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fallback, setFallback] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<ProblemCard | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage === "chat") {
      taRef.current?.focus();
      endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }
    if (stage === "edit") previewHeadingRef.current?.focus();
    if (stage === "published") doneHeadingRef.current?.focus();
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
        body: JSON.stringify({ draft, companyId }),
      });
      if (!res.ok) throw new Error("bad response");
      const card: ProblemCard = await res.json();
      setPublished(card);
      setStage("published");
    } catch {
      setError("Publishing didn't work. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    setAnswers(["", "", "", "", ""]);
    setStep(0);
    setValue("");
    setEditor(null);
    setSuggestions([]);
    setPublished(null);
    setError(null);
    setStage("chat");
  }

  if (stage === "generating") {
    return (
      <div className="mx-auto max-w-xl py-24 text-center" role="status" aria-live="polite">
        <div
          aria-hidden="true"
          className="mx-auto mb-6 size-8 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
        />
        <p className="font-display text-xl">Turning your answers into a problem card…</p>
        <p className="mt-2 text-sm text-muted-foreground">This usually takes a few seconds.</p>
      </div>
    );
  }

  if (stage === "published" && published) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 ref={doneHeadingRef} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
          Your problem card is live
        </h1>
        <p className="mt-2 text-muted-foreground">
          Talent can now read it and answer in their own words. You will see their answers without names.
        </p>
        <div className="my-8">
          <ProblemCardView card={published} company={company} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/company/card/${published.id}`} className={`${linkBtn} bg-primary text-primary-foreground hover:bg-primary/80`}>
            Review responses
          </Link>
          <button type="button" onClick={reset} className={`${linkBtn} border border-border bg-background hover:bg-muted`}>
            Write another
          </button>
        </div>
      </div>
    );
  }

  if (stage === "edit" && editor) {
    return (
      <div>
        <h1 ref={previewHeadingRef} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
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
      </div>
    );
  }

  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Tell us your problem</h1>
      <p className="mt-2 text-muted-foreground">
        Five short questions. We turn your answers into a problem card that talent can respond to.
      </p>
      <p className="mt-6 text-sm font-medium text-muted-foreground" aria-live="polite">
        Question {step + 1} of {QUESTIONS.length}
      </p>

      <div className="mt-4 space-y-3" aria-label="Conversation">
        {QUESTIONS.slice(0, step).map((qq, i) => (
          <div key={qq.key} className="space-y-3">
            <Bubble who="ai">{qq.text}</Bubble>
            <Bubble who="me">{answers[i]}</Bubble>
          </div>
        ))}
        <Bubble who="ai">{q.text}</Bubble>
        <div ref={endRef} />
      </div>

      <div className="mt-6 space-y-3">
        <label htmlFor="answer" className="sr-only">
          {q.text}
        </label>
        <Textarea
          id="answer"
          ref={taRef}
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          aria-describedby="answer-hint"
        />
        <p id="answer-hint" className="text-sm text-muted-foreground">
          {q.hint} Enter to send, Shift+Enter for a new line.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DictateButton value={value} onChange={setValue} />
        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={back}>
              Back
            </Button>
          )}
          <Button type="button" size="lg" onClick={send} disabled={!value.trim()}>
            {last ? "Create my card" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
