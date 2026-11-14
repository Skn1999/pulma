"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/* eslint-disable @typescript-eslint/no-explicit-any */
function getCtor(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
const subscribe = () => () => {};

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
  const [lang, setLang] = useState("en-US");
  const recRef = useRef<any>(null);

  if (supported === null) return null;
  if (!supported) {
    return <p className="text-xs text-muted-foreground">Dictation works in Chrome.</p>;
  }

  function start() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    const base = value;
    const sep = base && !/\s$/.test(base) ? " " : "";
    let finals = "";
    rec.onresult = (e: any) => {
      let interim = "";
      finals = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript;
        else interim += r[0].transcript;
      }
      onChange(base + sep + (finals + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  function stop() {
    recRef.current?.stop();
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
      <span aria-live="polite" className="text-sm font-medium text-primary">
        {listening ? "Listening…" : ""}
      </span>
    </div>
  );
}
