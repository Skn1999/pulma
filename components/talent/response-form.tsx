"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Languages, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { diffWords } from "diff";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiLabel } from "@/components/ai-label";
import { PreviewButton } from "@/components/thread/answer-preview";

const LANGS = ["English", "Finnish", "Swedish", "Ukrainian", "Spanish", "Russian", "Arabic", "Other"];
const SOFT_LIMIT = 600;
const btn = "min-h-11 px-4 text-sm";

export function ResponseForm({
  cardId, cardTitle, companyName, defaultLanguage, existing,
}: {
  cardId: string; cardTitle: string; companyName: string; defaultLanguage: string;
  existing?: { id: string; text: string; language: string; translatedText?: string; aiAssisted: boolean };
}) {
  const router = useRouter();
  const [text, setText] = useState(existing?.text ?? "");
  const [language, setLanguage] = useState(LANGS.includes(existing?.language ?? defaultLanguage) ? (existing?.language ?? defaultLanguage) : "Other");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [clarityMsg, setClarityMsg] = useState("");
  const [clarityAccepted, setClarityAccepted] = useState(existing?.aiAssisted ?? false);
  const [translation, setTranslation] = useState<string | null>(existing?.translatedText ?? null);
  const [translateMsg, setTranslateMsg] = useState("");
  const [busy, setBusy] = useState<"" | "clarity" | "translate" | "submit">("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const over = text.length > SOFT_LIMIT;
  const aiAssisted = clarityAccepted || !!translation;
  const trimmed = text.trim();

  function onChange(v: string) {
    setText(v);
    setSuggestion(null);
    setClarityMsg("");
    setTranslation(null); // translation belongs to the exact text it was made from
    setTranslateMsg("");
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

  async function translateIt() {
    setBusy("translate");
    setTranslateMsg("");
    try {
      const r = await post("/api/ai/translate", { text, from: language, to: "English" });
      if (r.text) setTranslation(r.text);
      else setTranslateMsg("Translation isn't available right now. The company will see your original text.");
    } catch {
      setTranslateMsg("Translation isn't available right now. The company will see your original text.");
    }
    setBusy("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy("submit");
    setError("");
    try {
      const payload = { text, originalLanguage: language, translatedText: translation ?? undefined, aiAssisted };
      const r = existing
        ? await post(`/api/responses/${existing.id}`, payload, "PATCH")
        : await post("/api/responses", { cardId, ...payload });
      setSent(true);
      toast.success(existing ? "Answer updated" : `Sent as Response #${r.publicCode}`);
      router.push("/talent/answers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setBusy("");
    }
  }

  const parts = suggestion ? diffWords(text, suggestion) : [];

  return (
    <form onSubmit={submit} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-2">
        <Button type="button" variant="ghost" className="min-h-11 gap-1 px-3" onClick={() => router.push(`/talent/card/${cardId}`)}>
          <X className="size-4" aria-hidden="true" /> Close
        </Button>
        {existing && <h1 className="text-sm font-semibold">Edit your answer</h1>}
        <Button type="submit" className="min-h-11 px-5" disabled={!trimmed || busy !== "" || sent}>
          {busy === "submit" ? (existing ? "Saving…" : "Sending…") : existing ? "Save changes" : "Send"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <button
            type="button"
            aria-expanded={showCard}
            onClick={() => setShowCard((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-muted-foreground">Answering · {companyName}</span>
              <span className={`block text-sm font-medium ${showCard ? "" : "truncate"}`}>{cardTitle}</span>
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${showCard ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          <label htmlFor="answer" className="sr-only">How would you approach this?</label>
          <Textarea
            id="answer"
            autoFocus
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder="3–5 sentences on how you'd approach this. Any language is fine."
            aria-describedby="answer-count"
            className="mt-3 min-h-48 resize-none border-0 bg-transparent px-1 text-lg leading-8 shadow-none focus-visible:ring-0"
          />

          <div aria-live="polite" className="space-y-3">
            {clarityMsg && <p className="text-sm text-muted-foreground">{clarityMsg}</p>}
            {translateMsg && <p className="text-sm text-muted-foreground">{translateMsg}</p>}
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

            {suggestion && (
              <div className="rounded-xl border border-border bg-card p-4">
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
                      setTranslation(null);
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

            {translation && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Translation for the company</h3>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your original ({language})</p>
                    <p className="mt-1 whitespace-pre-wrap leading-7">{text}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">English translation</p>
                    <p className="mt-1 whitespace-pre-wrap leading-7">{translation}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Using translation. The company sees both.</p>
                <Button type="button" variant="outline" className={`${btn} mt-3`} onClick={() => setTranslation(null)}>
                  Remove translation
                </Button>
              </div>
            )}

            {aiAssisted && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <AiLabel /> Shown to the company because AI helped with the wording.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t bg-sidebar pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-3 pt-2">
          <details className="group rounded-lg">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-1 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              What the company will see
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="px-1 pb-2 text-sm">
              <ul className="list-disc space-y-0.5 pl-5">
                <li>A response code (for example #A7)</li>
                <li>Your answer</li>
                <li>The translation, if you add one</li>
                <li>The AI-assisted label, if you used it</li>
              </ul>
              <p className="mt-1.5 text-muted-foreground">
                Not your name, photo, nationality, age, school or CV. Your name is shared only if they invite you AND you accept.
              </p>
            </div>
          </details>
        </div>
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 px-3 pb-2">
          <Button type="button" variant="outline" className={`${btn} shrink-0 gap-1.5`} disabled={!trimmed || busy !== ""} onClick={clarify}>
            <Sparkles className="size-4" aria-hidden="true" />
            {busy === "clarity" ? "Thinking…" : "Clearer"}
          </Button>
          {language !== "English" && (
            <Button type="button" variant="outline" className={`${btn} shrink-0 gap-1.5`} disabled={!trimmed || busy !== ""} onClick={translateIt}>
              <Languages className="size-4" aria-hidden="true" />
              {busy === "translate" ? "Translating…" : "Translate"}
            </Button>
          )}
          <PreviewButton
            companyName={companyName}
            disabled={!trimmed}
            answer={{ text, translatedText: translation, originalLanguage: language, aiAssisted }}
          />
          <label htmlFor="lang" className="sr-only">Language you wrote in</label>
          <select
            id="lang"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setTranslation(null);
            }}
            className="min-h-11 shrink-0 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {LANGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <p
            id="answer-count"
            aria-live="polite"
            className={`ml-auto shrink-0 whitespace-nowrap text-xs ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
          >
            {text.length}/{SOFT_LIMIT}
            {over && " · a bit long"}
          </p>
        </div>
      </div>
    </form>
  );
}
