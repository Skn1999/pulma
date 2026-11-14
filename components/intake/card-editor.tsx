"use client";

import { useId, useState } from "react";
import { Briefcase, Check, Plus, Sparkles, X } from "lucide-react";
import type { CardDraft, Format } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FORMATS: { value: Format; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

/** Languages where asking "needed for the work itself?" is a useful human check. */
const SOCIAL_CHECK_LANGUAGES = ["Finnish", "Swedish"];

export interface EditorState {
  draft: CardDraft;
  niceRaw: string;
}

export function splitList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

/** Old cards have no languagesNeeded: treat every language as needed, as ProblemCardView does. */
function neededOf(draft: Pick<CardDraft, "languages" | "languagesNeeded">): string[] {
  return draft.languagesNeeded ?? draft.languages;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "needed", label: "Needed for the work", Icon: Briefcase },
  { value: "nice", label: "Nice to have", Icon: Sparkles },
] as const;

function LanguageRow({
  lang,
  needed,
  onNeeded,
  onRemove,
}: {
  lang: string;
  needed: boolean;
  onNeeded: (needed: boolean) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const current = needed ? "needed" : "nice";
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="min-w-20 text-sm font-medium text-foreground">{lang}</span>
      <fieldset className="flex">
        <legend className="sr-only">How {lang} is used</legend>
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-border p-0.5">
          {ROLE_OPTIONS.map((opt) => {
            const id = `${uid}-${opt.value}`;
            const checked = current === opt.value;
            return (
              <span key={opt.value} className="contents">
                <input
                  id={id}
                  type="radio"
                  name={`${uid}-role`}
                  value={opt.value}
                  checked={checked}
                  onChange={() => onNeeded(opt.value === "needed")}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 ${
                    checked ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  {checked ? <Check className="size-3.5" aria-hidden="true" /> : <opt.Icon className="size-3.5" aria-hidden="true" />}
                  {opt.label}
                </label>
              </span>
            );
          })}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${lang}`}
        className="ml-auto rounded p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export function CardEditor({
  state,
  onChange,
}: {
  state: EditorState;
  onChange: (s: EditorState) => void;
}) {
  const { draft } = state;
  const [newLang, setNewLang] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const set = (patch: Partial<CardDraft>) => onChange({ ...state, draft: { ...draft, ...patch } });

  const needed = neededOf(draft);
  const isNeeded = (lang: string) => needed.includes(lang);

  function setNeeded(lang: string, value: boolean) {
    const next = new Set(needed);
    if (value) next.add(lang);
    else next.delete(lang);
    set({ languagesNeeded: draft.languages.filter((l) => next.has(l)) });
  }

  function removeLanguage(lang: string) {
    set({
      languages: draft.languages.filter((l) => l !== lang),
      languagesNeeded: needed.filter((l) => l !== lang),
    });
  }

  function addLanguage() {
    const name = newLang.trim();
    setNewLang("");
    if (!name || draft.languages.some((l) => l.toLowerCase() === name.toLowerCase())) return;
    // A newly added language is nice to have until a human says otherwise.
    set({ languages: [...draft.languages, name], languagesNeeded: needed });
  }

  const socialHints = needed.filter((l) => SOCIAL_CHECK_LANGUAGES.includes(l) && !dismissed.includes(l));

  return (
    <div className="space-y-5">
      <Field id="f-title" label="Title">
        <Input id="f-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field id="f-context" label="The problem">
        <Textarea id="f-context" rows={4} value={draft.context} onChange={(e) => set({ context: e.target.value })} />
      </Field>
      <Field id="f-week" label="Your first week">
        <Textarea id="f-week" rows={4} value={draft.weekOneReality} onChange={(e) => set({ weekOneReality: e.target.value })} />
      </Field>
      <Field id="f-hard" label="The hard part">
        <Textarea id="f-hard" rows={3} value={draft.hardPart} onChange={(e) => set({ hardPart: e.target.value })} />
      </Field>
      <Field id="f-nice" label="Bonus, not required (comma-separated)">
        <Input
          id="f-nice"
          value={state.niceRaw}
          onChange={(e) =>
            onChange({ ...state, niceRaw: e.target.value, draft: { ...draft, niceToHave: splitList(e.target.value) } })
          }
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Working languages</legend>
        <p className="text-xs text-muted-foreground">
          Needed for the work means week one is not possible without it. Nice to have means helpful, not required.
        </p>
        {draft.languages.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {draft.languages.map((lang) => (
              <LanguageRow
                key={lang}
                lang={lang}
                needed={isNeeded(lang)}
                onNeeded={(value) => setNeeded(lang, value)}
                onRemove={() => removeLanguage(lang)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No languages yet. Add the ones that are realistic in the team.</p>
        )}

        <div className="flex gap-2 pt-1">
          <label htmlFor="f-lang-add" className="sr-only">
            Add a language
          </label>
          <Input
            id="f-lang-add"
            value={newLang}
            placeholder="e.g. Swedish"
            onChange={(e) => setNewLang(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addLanguage();
              }
            }}
          />
          <button
            type="button"
            onClick={addLanguage}
            disabled={!newLang.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground outline-none hover:bg-muted disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add language
          </button>
        </div>

        {socialHints.map((lang) => (
          <div
            key={lang}
            className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground"
          >
            <p>
              Is {lang} needed for the work itself, or for the team&apos;s social life? Many teams start in English.
            </p>
            <button
              type="button"
              onClick={() => setDismissed([...dismissed, lang])}
              aria-label={`Dismiss the question about ${lang}`}
              className="shrink-0 rounded px-2 py-1 text-xs font-medium underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Dismiss
            </button>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Format</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {FORMATS.map((f) => (
            <label key={f.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                value={f.value}
                checked={draft.format === f.value}
                onChange={() => set({ format: f.value })}
                className="size-4 accent-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
