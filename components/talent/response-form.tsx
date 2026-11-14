"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { diffWords } from "diff";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiLabel } from "@/components/ai-label";

const LANGS = ["English", "Finnish", "Swedish", "Ukrainian", "Spanish", "Russian", "Arabic", "Other"];
const SOFT_LIMIT = 600;
const btn = "min-h-11 px-4 text-sm";

export function ResponseForm({ cardId, defaultLanguage }: { cardId: string; defaultLanguage: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(LANGS.includes(defaultLanguage) ? defaultLanguage : "Other");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [clarityMsg, setClarityMsg] = useState("");
  const [clarityAccepted, setClarityAccepted] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translateMsg, setTranslateMsg] = useState("");
  const [busy, setBusy] = useState<"" | "clarity" | "translate" | "submit">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

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

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
      const r = await post("/api/responses", {
        cardId,
        text,
        originalLanguage: language,
        translatedText: translation ?? undefined,
        aiAssisted,
      });
      setDone(r.publicCode);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setBusy("");
    }
  }

  if (done) {
    return (
      <div role="status" className="mt-4 rounded-lg border border-primary/40 bg-accent p-5 text-accent-foreground">
        <p className="font-display text-xl font-semibold">Answer sent as Response #{done}</p>
        <p className="mt-2 text-sm">
          The company sees only this code and your words. If they invite you, it will appear in your inbox.
        </p>
        <Link href="/talent/inbox" className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">
          Go to your inbox
        </Link>
      </div>
    );
  }

  const parts = suggestion ? diffWords(text, suggestion) : [];

  return (
    <form onSubmit={submit} className="mt-4 space-y-5">
      <div>
        <label htmlFor="answer" className="block text-base font-medium">
          How would you approach this?
        </label>
        <p id="answer-hint" className="mt-1 text-sm text-muted-foreground">
          3–5 sentences. Any language is fine.
        </p>
        <Textarea
          id="answer"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby="answer-hint answer-count"
          rows={7}
          className="mt-2 min-h-40 bg-card text-base"
        />
        <p
          id="answer-count"
          aria-live="polite"
          className={`mt-1 text-sm ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {text.length} / {SOFT_LIMIT} characters
          {over && " — a bit long. Shorter is easier to read, but you can still send it."}
        </p>
      </div>

      <div>
        <label htmlFor="lang" className="block text-sm font-medium">
          Language you wrote in
        </label>
        <select
          id="lang"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setTranslation(null);
          }}
          className="mt-1 min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-60"
        >
          {LANGS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" className={btn} disabled={!trimmed || busy !== ""} onClick={clarify}>
          {busy === "clarity" ? "Thinking…" : "Make this clearer"}
        </Button>
        {language !== "English" && (
          <Button type="button" variant="outline" className={btn} disabled={!trimmed || busy !== ""} onClick={translateIt}>
            {busy === "translate" ? "Translating…" : "Translate for the company"}
          </Button>
        )}
      </div>

      <div aria-live="polite" className="space-y-4">
        {clarityMsg && <p className="text-sm text-muted-foreground">{clarityMsg}</p>}
        {translateMsg && <p className="text-sm text-muted-foreground">{translateMsg}</p>}

        {suggestion && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Suggested edit</h3>
            <p className="mt-2 whitespace-pre-wrap leading-7">
              {parts.map((p, i) =>
                p.added ? (
                  <ins key={i} className="underline decoration-2 underline-offset-2">
                    <span className="sr-only">[added: </span>
                    {p.value}
                    <span className="sr-only">]</span>
                  </ins>
                ) : p.removed ? (
                  <del key={i} className="text-muted-foreground line-through">
                    <span className="sr-only">[removed: </span>
                    {p.value}
                    <span className="sr-only">]</span>
                  </del>
                ) : (
                  <span key={i}>{p.value}</span>
                ),
              )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <del className="line-through">Struck through</del> = removed · <ins className="underline">underlined</ins> = added
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
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
          <div className="rounded-lg border border-border bg-card p-4">
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
            <p className="mt-2 text-xs text-muted-foreground">Using translation — the company sees both.</p>
            <Button type="button" variant="outline" className={`${btn} mt-3`} onClick={() => setTranslation(null)}>
              Remove translation
            </Button>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {aiAssisted && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <AiLabel /> This label is shown to the company because AI helped with the wording.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted p-4 text-sm">
        <h3 className="font-semibold">What the company will see</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A response code (for example #A7)</li>
          <li>Your answer</li>
          <li>The translation, if you add one</li>
          <li>The AI-assisted label, if you used it</li>
        </ul>
        <p className="mt-2">
          Not your name, photo, nationality, age, school or CV. Your name is shared only if they invite you AND you accept.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="min-h-11 w-full px-6 text-base sm:w-auto" disabled={!trimmed || busy !== ""}>
        {busy === "submit" ? "Sending…" : "Send my answer"}
      </Button>
    </form>
  );
}
