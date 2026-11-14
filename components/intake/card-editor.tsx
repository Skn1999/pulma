"use client";

import type { CardDraft, Format } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FORMATS: { value: Format; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export interface EditorState {
  draft: CardDraft;
  niceRaw: string;
  langRaw: string;
}

export function splitList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
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

export function CardEditor({
  state,
  onChange,
}: {
  state: EditorState;
  onChange: (s: EditorState) => void;
}) {
  const { draft } = state;
  const set = (patch: Partial<CardDraft>) => onChange({ ...state, draft: { ...draft, ...patch } });
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
      <Field id="f-lang" label="Working languages (comma-separated)">
        <Input
          id="f-lang"
          value={state.langRaw}
          onChange={(e) =>
            onChange({ ...state, langRaw: e.target.value, draft: { ...draft, languages: splitList(e.target.value) } })
          }
        />
      </Field>
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
