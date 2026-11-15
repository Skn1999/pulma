// Candidate skills: private to the talent. Pure helpers, no Next imports, no AI.
// Matching is a deterministic, visible tag overlap. It never ranks or hides anything (CLAUDE.md hard rule 1).
import type { EscoRef, SkillRef, TalentSkill } from "./types";
import { parseEscoRef } from "./esco-ref";

export const MAX_SKILLS = 15;
export const MAX_SKILL_LENGTH = 60;
export const MAX_CV_CHARS = 15000;

/** Words too common to count as "the same skill". */
const STOPWORDS = new Set([
  "with", "from", "that", "this", "into", "about", "your", "using", "used", "work", "working", "skills", "skill",
  "basic", "good", "strong", "other", "people", "team", "teams", "have", "make", "making", "real", "some",
]);

export function normaliseSkill(label: string): string {
  return label.replace(/\s+/g, " ").trim().slice(0, MAX_SKILL_LENGTH).trim();
}

function words(label: string): Set<string> {
  const out = new Set<string>();
  for (const w of label.toLowerCase().split(/[^\p{L}\p{N}+#]+/u)) {
    if (w.length >= 4 && !STOPWORDS.has(w)) out.add(w);
  }
  return out;
}

/** The ESCO link of a card tag, if the card has one for that label. */
function refOf(tag: string, refs: SkillRef[] | undefined): EscoRef | undefined {
  const key = tag.trim().toLowerCase();
  return refs?.find((r) => r.label.trim().toLowerCase() === key)?.esco;
}

/**
 * The card tags that match any of the talent's skills. Order follows the card's own tag order.
 * Same ESCO uri matches first; otherwise the visible word rule (equal label, or a shared meaningful word).
 */
export function skillMatches(
  talentSkills: { label: string; esco?: EscoRef }[] | undefined,
  cardSkills: string[] | undefined,
  cardRefs?: SkillRef[],
): string[] {
  if (!talentSkills?.length || !cardSkills?.length) return [];
  const mine = talentSkills.map((s) => ({ key: s.label.trim().toLowerCase(), words: words(s.label), uri: s.esco?.uri }));
  return cardSkills.filter((tag) => {
    const uri = refOf(tag, cardRefs)?.uri;
    if (uri && mine.some((m) => m.uri === uri)) return true;
    const key = tag.trim().toLowerCase();
    const tagWords = words(tag);
    return mine.some((m) => m.key === key || [...tagWords].some((w) => m.words.has(w)));
  });
}

/** Skills the talent has that relate to a card (the talent's own labels, for the respond page). */
export function relatedSkillLabels(
  talentSkills: { label: string; esco?: EscoRef }[] | undefined,
  cardSkills: string[] | undefined,
  cardRefs?: SkillRef[],
): string[] {
  if (!talentSkills?.length || !cardSkills?.length) return [];
  return talentSkills
    .filter((s) => skillMatches([s], cardSkills, cardRefs).length > 0)
    .map((s) => s.label);
}

/** Work skills the offline fallback looks for in pasted CV text. */
export const FALLBACK_VOCAB = [
  "Python", "SQL", "Excel", "JavaScript", "TypeScript", "React", "Java", "C++", "Rust", "Unity", "Unreal Engine",
  "Data analysis", "Data cleaning", "Data visualisation", "Statistics", "Machine learning", "Sensor data",
  "Battery", "Embedded systems", "Robotics", "Computer vision", "3D modelling", "CAD", "Prototyping",
  "User research", "Interviewing users", "Usability testing", "UX design", "UI design", "Game design",
  "Level design", "Product management", "Project management", "Customer support", "Onboarding",
  "Technical writing", "Technical translation", "Translation", "Teaching", "Training", "Mentoring",
  "Presenting", "Public speaking", "Sales", "Marketing", "Content writing", "Accounting", "Bookkeeping",
  "Invoicing", "Logistics", "Warehouse operations", "Inventory", "Quality assurance", "Software testing",
  "Process improvement", "Lab experiments", "Electronics", "PLC programming", "Nursing", "Patient care",
  "Safety procedures", "Cloud", "Git",
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Vocabulary terms found in the text (offline suggestion). Max 12, in vocabulary order. */
export function fallbackExtract(text: string): string[] {
  const hay = String(text ?? "");
  const out: string[] = [];
  for (const term of FALLBACK_VOCAB) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(term)}(?![\\p{L}\\p{N}])`, "iu");
    if (re.test(hay)) out.push(term);
    if (out.length >= 12) break;
  }
  return out;
}

export type SkillsInput = { ok: true; skills: TalentSkill[] } | { ok: false; error: string };

/** Validates the PUT /api/skills body. Keeps the original addedAt of labels that were already there. */
export function parseSkillsInput(body: unknown, existing: TalentSkill[] | undefined, nowIso: string): SkillsInput {
  const raw = (body as { skills?: unknown } | null)?.skills;
  if (!Array.isArray(raw)) return { ok: false, error: "skills must be a list" };
  if (raw.length > MAX_SKILLS) return { ok: false, error: `You can keep up to ${MAX_SKILLS} skills.` };
  const out: TalentSkill[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const o = item as { label?: unknown; source?: unknown; esco?: unknown } | null;
    if (!o || typeof o.label !== "string") return { ok: false, error: "Each skill needs a label" };
    const label = normaliseSkill(o.label);
    if (!label) return { ok: false, error: "A skill can't be empty" };
    if (o.label.trim().length > MAX_SKILL_LENGTH) return { ok: false, error: `Keep each skill under ${MAX_SKILL_LENGTH} characters` };
    if (o.source !== "cv" && o.source !== "self") return { ok: false, error: "Invalid skill source" };
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = existing?.find((s) => s.label.toLowerCase() === key);
    const esco = parseEscoRef(o.esco) ?? (o.esco === undefined ? prev?.esco : undefined);
    out.push({ label, ...(esco ? { esco } : {}), source: o.source, addedAt: prev?.addedAt ?? nowIso });
  }
  return { ok: true, skills: out };
}

/** Card "Work involved": up to 6 unique visible labels, plus ESCO links for those labels that have a valid one. */
export function parseCardSkills(skills: unknown, refs: unknown): { skills: string[]; skillRefs?: SkillRef[] } {
  const labels = new Map<string, string>();
  for (const x of Array.isArray(skills) ? skills : []) {
    if (typeof x !== "string") continue;
    const label = x.trim().slice(0, MAX_SKILL_LENGTH);
    if (label && !labels.has(label.toLowerCase())) labels.set(label.toLowerCase(), label);
  }
  const list = [...labels.values()].slice(0, 6);
  const skillRefs: SkillRef[] = [];
  for (const r of Array.isArray(refs) ? refs : []) {
    const label = typeof r?.label === "string" ? r.label.trim().toLowerCase() : "";
    const esco = parseEscoRef(r?.esco);
    const visible = labels.get(label);
    if (esco && visible && list.includes(visible) && !skillRefs.some((x) => x.label === visible)) skillRefs.push({ label: visible, esco });
  }
  return { skills: list, ...(skillRefs.length ? { skillRefs } : {}) };
}
