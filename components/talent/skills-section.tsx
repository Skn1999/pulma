"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EscoSkillInput } from "@/components/esco-skill-input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CV_CHARS, MAX_SKILLS } from "@/lib/skills";
import { ESCO_ATTRIBUTION } from "@/lib/esco-ref";
import type { EscoRef, SkillRef } from "@/lib/types";

interface Skill {
  label: string;
  source: "cv" | "self";
  esco?: EscoRef;
}

const btn = "min-h-11 px-4 text-sm";

/** Talent only. Skills are the person's own choices; the CV text is used once and never saved. */
export function SkillsSection({ initial }: { initial: Skill[] }) {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>(initial);
  const [cv, setCv] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [asked, setAsked] = useState(false);
  const [escoFor, setEscoFor] = useState<Record<string, EscoRef>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const has = (label: string, list = skills) => list.some((s) => s.label.toLowerCase() === label.toLowerCase());
  const full = skills.length >= MAX_SKILLS;

  async function save(next: Skill[]): Promise<boolean> {
    try {
      const res = await fetch("/api/skills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: next }) });
      const data = (await res.json().catch(() => ({}))) as { skills?: Skill[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save your skills");
      setSkills(data.skills ?? next);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your skills");
      return false;
    }
  }

  async function suggest() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/skills/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: cv }) });
      const data = (await res.json().catch(() => ({}))) as { suggestions?: string[]; esco?: Record<string, EscoRef>; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not suggest skills");
      setSuggestions(data.suggestions ?? []);
      setEscoFor(data.esco ?? {});
      setAsked(true);
      setCv(""); // the CV is used once; drop it from the page too
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not suggest skills");
    }
    setBusy(false);
  }

  async function accept(labels: string[]) {
    const add = labels.filter((l, i) => !has(l) && labels.indexOf(l) === i).slice(0, MAX_SKILLS - skills.length);
    if (!add.length) return;
    const ok = await save([...skills, ...add.map((label) => ({ label, source: "cv" as const, ...(escoFor[label] ? { esco: escoFor[label] } : {}) }))]);
    if (ok) setSuggestions((cur) => cur.filter((s) => !add.includes(s)));
  }

  async function addPicked(pick: SkillRef) {
    if (has(pick.label) || (pick.esco && skills.some((s) => s.esco?.uri === pick.esco?.uri))) return;
    if (full) return setMsg(`You can keep up to ${MAX_SKILLS} skills. Remove one first.`);
    setMsg("");
    await save([...skills, { label: pick.label, source: "self", ...(pick.esco ? { esco: pick.esco } : {}) }]);
  }

  function readFile(file: File | undefined) {
    if (!file) return;
    setMsg("");
    if (file.size > MAX_CV_CHARS * 4) return setMsg("That file is too big. Paste the main parts instead.");
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result ?? "");
      if (t.length > MAX_CV_CHARS) setMsg(`Only the first ${MAX_CV_CHARS.toLocaleString("en")} characters will be used.`);
      setCv(t.slice(0, MAX_CV_CHARS)); // read in the browser; nothing is uploaded until you press "Suggest skills"
    };
    reader.onerror = () => setMsg("Could not read that file. Try pasting the text instead.");
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section id="skills" aria-labelledby="skills-h" className="scroll-mt-4 rounded-xl border bg-card p-5">
      <h2 id="skills-h" className="font-display text-xl font-semibold">Your skills — only you see these</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        They help Explore show which problems use your skills. Companies never see them, and they never change what a company sees or the order of answers.
      </p>

      <div className="mt-4 space-y-2">
        <label htmlFor="cv-text" className="text-sm font-medium">Paste your CV (optional)</label>
        <Textarea
          id="cv-text"
          rows={5}
          value={cv}
          maxLength={MAX_CV_CHARS}
          onChange={(e) => setCv(e.target.value)}
          aria-describedby="cv-note"
          placeholder="Paste the text of your CV here"
        />
        <p id="cv-note" className="text-xs text-muted-foreground">
          Your CV is used once to suggest skills. It is not saved, and companies never see it or your skills.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className={`${btn} gap-1.5`} disabled={busy || !cv.trim()} onClick={suggest}>
            <Sparkles className="size-4" aria-hidden="true" />
            {busy ? "Looking…" : "Suggest skills"}
          </Button>
          <input ref={fileRef} id="cv-file" type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
          <label
            htmlFor="cv-file"
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 [&:focus-within]:ring-3 [&:focus-within]:ring-ring/50"
          >
            Or choose a .txt or .md file
          </label>
        </div>
      </div>

      <div aria-live="polite" className="mt-3">
        {msg && <p role="alert" className="text-sm font-medium text-destructive">{msg}</p>}
        {asked && suggestions.length === 0 && !msg && (
          <p className="text-sm text-muted-foreground">No new skills to suggest. You can type your own below.</p>
        )}
        {suggestions.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium">Suggested by AI from your CV — you choose which to keep</p>
            <ul className="mt-2 space-y-1.5">
              {suggestions.map((s) => (
                <li key={s} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
                  <span className="min-w-0 flex-1 text-sm">
                    {s}
                    {escoFor[s] && <EscoTag esco={escoFor[s]} />}
                  </span>
                  <Button type="button" variant="outline" className={btn} disabled={full} onClick={() => accept([s])} aria-label={`Add ${s}`}>
                    <Plus className="size-4" aria-hidden="true" /> Add
                  </Button>
                  <Button type="button" variant="ghost" className={btn} onClick={() => setSuggestions((c) => c.filter((x) => x !== s))} aria-label={`Dismiss ${s}`}>
                    Dismiss
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" className={`${btn} mt-2`} disabled={full} onClick={() => accept(suggestions)}>
              Add all
            </Button>
            {full && <p className="mt-1 text-xs text-muted-foreground">You have {MAX_SKILLS} skills already. Remove one to add more.</p>}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="own-skill" className="text-sm font-medium">Add a skill</label>
        <EscoSkillInput
          id="own-skill"
          large
          disabled={full}
          describedBy="own-skill-help"
          placeholder="Start typing, e.g. Python or cleaning data"
          isTaken={(label, esco) => has(label) || (!!esco && skills.some((s) => s.esco?.uri === esco.uri))}
          onPick={addPicked}
        />
        <p id="own-skill-help" className="text-xs text-muted-foreground">
          Pick a match from ESCO, the European skills list, or keep your own words. {ESCO_ATTRIBUTION}.
        </p>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Your skills ({skills.length} of {MAX_SKILLS})</h3>
      {skills.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No skills yet. They are optional.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.map((s) => (
            <li key={s.label} className="flex items-center gap-1 rounded-full border border-border bg-background pl-3 pr-1 text-sm">
              {s.label}
              {s.esco && <EscoTag esco={s.esco} />}
              <button
                type="button"
                onClick={() => save(skills.filter((x) => x.label !== s.label))}
                aria-label={`Remove ${s.label}`}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Small tag on skills linked to ESCO; the title shows the ESCO label. */
function EscoTag({ esco }: { esco: EscoRef }) {
  return (
    <span title={`ESCO: ${esco.label}`} className="ml-2 rounded border border-border px-1.5 py-0.5 align-middle text-xs text-muted-foreground">
      ESCO<span className="sr-only">: {esco.label}</span>
    </span>
  );
}
