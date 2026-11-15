"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/* eslint-disable @typescript-eslint/no-explicit-any */
function getCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
const subscribe = () => () => {};

/** Join two pieces of text with exactly one space between them. */
function join(a: string, b: string): string {
  const x = a.replace(/\s+$/, "");
  const y = b.trim();
  return x && y ? `${x} ${y}` : x || y;
}

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it from the icon in the address bar, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow it from the icon in the address bar, then try again.",
  "audio-capture": "No microphone was found.",
  // Brave, Arc, Opera, Vivaldi and other Chromium browsers expose the API without a speech service behind it:
  // they fail at once with "network". So do Chrome and Edge when offline.
  network: "This browser has no speech service (common in Brave, Arc, Opera), or you are offline. Try Chrome, Edge or Safari, or type instead.",
  "language-not-supported": "This browser can't dictate in that language.",
};

/**
 * Speech-to-text into the answer box (browser Web Speech API; nothing is sent to Pulma's servers).
 * - Keeps listening until Stop: the browser ends a session after a pause, so it is restarted quietly.
 * - Spoken phrases are joined with spaces and added after what is already in the box.
 * - Typing in the box, or sending the answer, stops dictation, so it never overwrites an edit or spills into the
 *   next question.
 * - Problems (microphone blocked, offline) are said in words; dictation is optional, typing always works.
 */
export function DictateButton({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const supported = useSyncExternalStore(subscribe, () => !!getCtor(), () => null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState("en-US");
  const recRef = useRef<any>(null);
  const wantRef = useRef(false); // the person has pressed Dictate and not yet Stop
  const committedRef = useRef(""); // text that earlier sessions have settled
  const writtenRef = useRef<string | null>(null); // the last text dictation put in the box
  const quickEndsRef = useRef(0); // sessions that ended at once with nothing heard (guards a restart loop)
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Typing or sending changes the box from outside: stop, so dictation never overwrites it.
  useEffect(() => {
    if (wantRef.current && writtenRef.current !== null && value !== writtenRef.current) {
      wantRef.current = false;
      if (recRef.current) recRef.current.cutOff = true; // whatever it still hears is dropped
      recRef.current?.abort();
    }
  }, [value]);

  // Leaving the page (or the question) ends dictation.
  useEffect(
    () => () => {
      wantRef.current = false;
      if (recRef.current) recRef.current.cutOff = true;
      recRef.current?.abort();
    },
    [],
  );

  if (supported === null) return null;
  if (!supported) {
    return <p className="text-xs text-muted-foreground">Dictation works in Chrome, Edge and Safari. You can type instead.</p>;
  }

  function session() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    const startedAt = Date.now();
    let heard = "";
    rec.onresult = (e: any) => {
      if (rec.cutOff) return;
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      heard = parts.reduce((acc, p) => join(acc, p), "");
      const next = join(committedRef.current, heard);
      writtenRef.current = next;
      onChangeRef.current(next);
    };
    rec.onerror = (e: any) => {
      const code = String(e?.error ?? "unknown");
      if (code === "no-speech" || code === "aborted") return; // normal: the end handler decides whether to carry on
      console.warn("Dictation error:", code);
      wantRef.current = false;
      setError(ERROR_TEXT[code] ?? `Dictation stopped (${code}). Try again, or type instead.`);
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (!rec.cutOff) committedRef.current = join(committedRef.current, heard);
      quickEndsRef.current = !heard && Date.now() - startedAt < 1000 ? quickEndsRef.current + 1 : 0;
      if (wantRef.current && quickEndsRef.current < 3) {
        session(); // the browser paused it; keep going until Stop
        return;
      }
      // Ended on its own straight away, again and again, with no error: say so instead of stopping silently.
      if (wantRef.current) setError("Dictation stopped straight away in this browser. Try Chrome, Edge or Safari, or type instead.");
      wantRef.current = false;
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.warn("Dictation could not start:", err);
      setError("Dictation could not start in this browser. You can type instead.");
      wantRef.current = false;
      recRef.current = null;
      setListening(false);
    }
  }

  function start() {
    setError(null);
    committedRef.current = value;
    writtenRef.current = value;
    quickEndsRef.current = 0;
    wantRef.current = true;
    setListening(true);
    session();
  }

  function stop() {
    wantRef.current = false;
    recRef.current?.stop(); // stop (not abort) keeps the last phrase, which may still arrive
    setListening(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="dictate-lang">
        Dictation language
      </label>
      <select
        id="dictate-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        disabled={listening}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="en-US">English</option>
        <option value="fi-FI">Suomi</option>
      </select>
      {listening ? (
        <Button type="button" variant="default" onClick={stop}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="10" height="10" rx="1.5" />
          </svg>
          Stop
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={start} disabled={disabled}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="6" y="1.5" width="4" height="8" rx="2" />
            <path d="M3.5 8a4.5 4.5 0 009 0M8 12.5V15" strokeLinecap="round" />
          </svg>
          Dictate
        </Button>
      )}
      <span aria-live="polite" className="inline-flex items-center gap-1.5 text-sm">
        {listening && (
          <>
            <span aria-hidden="true" className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />
            <span className="font-medium text-primary">Listening… typing stops it</span>
          </>
        )}
        {!listening && error && <span className="text-destructive">{error}</span>}
      </span>
    </div>
  );
}
