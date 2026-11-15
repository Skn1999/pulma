"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
 * useDictation: speech-to-text into an answer box (browser Web Speech API; nothing is sent to Pulma's servers).
 * - Keeps listening until Stop: the browser ends a session after a pause, so it is restarted quietly.
 * - Spoken phrases are joined with spaces and added after what is already in the box.
 * - Typing in the box, or sending the answer, stops dictation, so it never overwrites an edit or spills into the
 *   next question.
 * - Problems (microphone blocked, offline) are said in words; dictation is optional, typing always works.
 */
export const DICTATION_LANGS = [
  { value: "en-US", label: "English" },
  { value: "fi-FI", label: "Suomi" },
] as const;

export interface Dictation {
  supported: boolean | null; // null until known (server render)
  listening: boolean;
  error: string | null;
  lang: string;
  setLang: (l: string) => void;
  start: () => void;
  stop: () => void;
  cancel: () => void; // stop and drop anything still being heard (sending, going back)
}

export function useDictation({ value, onChange }: { value: string; onChange: (v: string) => void }): Dictation {
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

  function cancel() {
    wantRef.current = false;
    if (recRef.current) recRef.current.cutOff = true;
    recRef.current?.abort();
    setListening(false);
  }

  return { supported, listening, error, lang, setLang, start, stop, cancel };
}
