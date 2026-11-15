"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { normaliseSkill, MAX_SKILL_LENGTH } from "@/lib/skills";
import type { EscoRef, SkillRef } from "@/lib/types";

type Option = { kind: "esco"; ref: EscoRef } | { kind: "free"; label: string };

/**
 * Accessible skill combobox (ARIA 1.2 editable combobox with list autocomplete).
 * Suggestions come from ESCO via /api/esco/skills (debounced 200ms); a last option always lets the person
 * keep their own words. Picking calls onPick; the parent decides what to do with it.
 */
export function EscoSkillInput({
  id,
  onPick,
  isTaken,
  large = false,
  disabled = false,
  placeholder,
  describedBy,
  lang = "en",
}: {
  id: string;
  onPick: (skill: SkillRef) => void;
  isTaken?: (label: string, esco?: EscoRef) => boolean;
  large?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  lang?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [found, setFound] = useState<EscoRef[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      ctrl.current?.abort();
    },
    [],
  );

  const query = normaliseSkill(text);
  const options: Option[] = [
    ...found.filter((r) => !isTaken?.(r.label, r)).map((ref) => ({ kind: "esco" as const, ref })),
    ...(query ? [{ kind: "free" as const, label: query }] : []),
  ];
  const showList = open && options.length > 0;
  const optId = (i: number) => `${uid}-opt-${i}`;

  function search(value: string) {
    if (timer.current) clearTimeout(timer.current);
    ctrl.current?.abort();
    const q = value.trim();
    if (q.length < 2) {
      setFound([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctrl.current = c;
      try {
        const res = await fetch(`/api/esco/skills?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`, { signal: c.signal });
        const data = (await res.json().catch(() => ({}))) as { suggestions?: EscoRef[] };
        setFound(res.ok && Array.isArray(data.suggestions) ? data.suggestions : []);
        setStatus("done");
      } catch {
        if (!c.signal.aborted) {
          setFound([]);
          setStatus("done");
        }
      }
    }, 200);
  }

  function pick(o: Option) {
    if (o.kind === "esco") onPick({ label: o.ref.label.slice(0, MAX_SKILL_LENGTH), esco: o.ref });
    else onPick({ label: o.label });
    setText("");
    setFound([]);
    setStatus("idle");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!options.length) return;
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      setOpen(true);
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault(); // never submits a surrounding form
      const o = showList && active >= 0 ? options[active] : options.find((x) => x.kind === "free");
      if (o) pick(o);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const message =
    status === "loading" ? "Searching ESCO skills" : status === "done" ? (found.length ? `${found.length} ESCO suggestions. Use the arrow keys to choose.` : "No ESCO match. You can add it as your own words.") : "";

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optId(active) : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={text}
        maxLength={MAX_SKILL_LENGTH}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setActive(-1);
          setOpen(true);
          search(e.target.value);
        }}
        onFocus={() => text.trim() && setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          large ? "h-11" : "h-9",
        )}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Skill suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
      >
        {options.map((o, i) => (
          <li
            key={o.kind === "esco" ? o.ref.uri : "free"}
            id={optId(i)}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()} // keep focus in the input
            onClick={() => pick(o)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-3 text-sm",
              large ? "min-h-11" : "min-h-9",
              i === active ? "bg-muted font-medium" : "hover:bg-muted",
            )}
          >
            {o.kind === "esco" ? (
              <>
                <span className="min-w-0 flex-1">{o.ref.label}</span>
                <span className="shrink-0 rounded border border-border px-1.5 text-xs text-muted-foreground">ESCO</span>
              </>
            ) : (
              <>
                <Plus className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  {found.some((r) => !isTaken?.(r.label, r)) ? "Not these? Add" : status === "done" ? "No ESCO match — add" : "Add"} &ldquo;{o.label}&rdquo; as your own words
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
