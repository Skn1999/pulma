"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { diffWords } from "diff";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiLabel } from "@/components/ai-label";
import { RelatedSkills } from "@/components/talent/related-skills";
import { PreviewButton } from "@/components/thread/answer-preview";

const SOFT_LIMIT = 600;
const btn = "min-h-11 px-4 text-sm";

/**
 * The answer form, inline on the problem page (beside the card on wide screens, under it on phones), so the
 * problem stays in view while writing. No language picker: answers are written in one of the problem's working
 * languages; an edit keeps the language already stored.
 */
export function ResponseForm({
  cardId, companyName, existing, relatedSkills = [], languages = [], recap,
}: {
  cardId: string; companyName: string; relatedSkills?: string[]; languages?: string[];
  recap?: { title: string; hardPart: string }; // phones: the problem in two lines above the text box
  existing?: { id: string; publicCode: string; text: string; language: string; aiAssisted: boolean };
}) {
  const router = useRouter();
  const [text, setText] = useState(existing?.text ?? "");
  const language = existing?.language ?? languages[0] ?? "English";
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [clarityMsg, setClarityMsg] = useState("");
  const [clarityAccepted, setClarityAccepted] = useState(existing?.aiAssisted ?? false);
  const [busy, setBusy] = useState<"" | "clarity" | "submit">("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const over = text.length > SOFT_LIMIT;
  const aiAssisted = clarityAccepted;
  const trimmed = text.trim();

  function onChange(v: string) {
    setText(v);
    setSuggestion(null);
    setClarityMsg("");
  }

  async function post(url: string, body: unknown, method = "POST") {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Something went wrong");
    return res.json();
  }

  async function clarify() {
    setBusy("clarity");
    setClarityMsg("");
    setSuggestion(null);
    try {
      const r = await post("/api/ai/clarity", { text });
      if (r.suggestion && r.suggestion.trim() !== text.trim()) setSuggestion(r.suggestion);
      else setClarityMsg("No suggestions right now — your words are fine.");
    } catch {
      setClarityMsg("No suggestions right now — your words are fine.");
    }
    setBusy("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy("submit");
    setError("");
    try {
      const payload = { text, originalLanguage: language, aiAssisted };
      const r = existing
        ? await post(`/api/responses/${existing.id}`, payload, "PATCH")
        : await post("/api/responses", { cardId, ...payload });
      setSent(true);
      toast.success(existing ? "Answer updated" : `Sent as Response #${r.publicCode}`);
      if (existing) {
        setSent(false);
        setBusy("");
        router.refresh();
      } else {
        router.push("/talent/answers");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setBusy("");
    }
  }

  const parts = suggestion ? diffWords(text, suggestion) : [];
  const changed = !existing || trimmed !== existing.text.trim() || aiAssisted !== existing.aiAssisted;

  return (
    <form onSubmit={submit} aria-labelledby="answer-h" className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <h2 id="answer-h" className="font-display text-lg font-semibold">
        {existing ? <>Your answer · #{existing.publicCode}</> : "Your answer"}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        3–5 sentences on how you&apos;d approach this{languages.length ? `, in ${languages.join(" or ")}` : ""}.
      </p>

      {recap && (
        <div className="mt-3 rounded-lg border-l-3 border-primary bg-muted/60 px-3 py-2 text-sm lg:hidden">
          <p className="font-medium">{recap.title}</p>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium text-foreground">The hard part: </span>
            {recap.hardPart}
          </p>
          <a href="#problem" className="mt-1 inline-flex min-h-9 items-center text-xs font-medium text-primary underline underline-offset-4">
            Read the whole problem
          </a>
        </div>
      )}

      <RelatedSkills className="mt-3" skills={relatedSkills} />

      <label htmlFor="answer" className="sr-only">How would you approach this?</label>
      <Textarea
        id="answer"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Where would you start, what would you check first, and what have you done that's similar?"
        aria-describedby="answer-count"
        className="mt-3 min-h-44 resize-y text-base leading-7"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!trimmed || busy !== ""} onClick={clarify}>
          <Sparkles className="size-4" aria-hidden="true" />
          {busy === "clarity" ? "Thinking…" : "Make this clearer"}
        </Button>
        <PreviewButton companyName={companyName} disabled={!trimmed} answer={{ text, originalLanguage: language, aiAssisted }} />
        <p
          id="answer-count"
          aria-live="polite"
          className={`ml-auto shrink-0 whitespace-nowrap text-xs ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {text.length}/{SOFT_LIMIT}
          {over && " · a bit long"}
        </p>
      </div>

      <div aria-live="polite" className="mt-3 space-y-3 empty:mt-0">
        {clarityMsg && <p className="text-sm text-muted-foreground">{clarityMsg}</p>}
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        {suggestion && (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold">Suggested edit</h3>
            <p className="mt-2 whitespace-pre-wrap leading-7">
              {parts.map((p, i) =>
                p.added ? (
                  <ins key={i} className="underline decoration-2 underline-offset-2">
                    <span className="sr-only">[added: </span>{p.value}<span className="sr-only">]</span>
                  </ins>
                ) : p.removed ? (
                  <del key={i} className="text-muted-foreground line-through">
                    <span className="sr-only">[removed: </span>{p.value}<span className="sr-only">]</span>
                  </del>
                ) : (
                  <span key={i}>{p.value}</span>
                ),
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <del className="line-through">Struck through</del> = removed · <ins className="underline">underlined</ins> = added
            </p>
            <div className="mt-3 flex gap-3">
              <Button
                type="button"
                className={btn}
                onClick={() => {
                  setText(suggestion);
                  setSuggestion(null);
                  setClarityAccepted(true);
                }}
              >
                Accept
              </Button>
              <Button type="button" variant="outline" className={btn} onClick={() => setSuggestion(null)}>
                Keep mine
              </Button>
            </div>
          </div>
        )}

        {aiAssisted && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <AiLabel /> Shown to the company because AI helped with the wording.
          </p>
        )}
      </div>

      <details className="group mt-3 rounded-lg border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          What the company will see
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-3 pb-3 text-sm">
          <ul className="list-disc space-y-0.5 pl-5">
            <li>A response code (for example #A7)</li>
            <li>Your answer</li>
            <li>The AI-assisted label, if you used it</li>
          </ul>
          <p className="mt-1.5 text-muted-foreground">
            Not your name, photo, nationality, age, school or CV. Your name is shared only if they invite you AND you accept.
          </p>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" className="min-h-11 flex-1 px-5 sm:flex-none" disabled={!trimmed || !changed || busy !== "" || sent}>
          {busy === "submit" ? (existing ? "Saving…" : "Sending…") : existing ? "Save changes" : "Send my answer"}
        </Button>
        {existing && (
          <Link href="/talent/answers" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
            See its status
          </Link>
        )}
      </div>
    </form>
  );
}
