// Candidate skills: private to the talent. Pure helpers, no Next imports, no AI.
// Matching is a deterministic, visible tag overlap. It never ranks or hides anything (CLAUDE.md hard rule 1).
import type { TalentSkill } from "./types";

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

/** The card tags that match any of the talent's skills. Order follows the card's own tag order. */
export function skillMatches(talentSkills: { label: string }[] | undefined, cardSkills: string[] | undefined): string[] {
  if (!talentSkills?.length || !cardSkills?.length) return [];
  const mine = talentSkills.map((s) => ({ key: s.label.trim().toLowerCase(), words: words(s.label) }));
  return cardSkills.filter((tag) => {
    const key = tag.trim().toLowerCase();
    const tagWords = words(tag);
    return mine.some((m) => m.key === key || [...tagWords].some((w) => m.words.has(w)));
  });
}

/** Skills the talent has that relate to a card (the talent's own labels, for the respond page). */
export function relatedSkillLabels(talentSkills: { label: string }[] | undefined, cardSkills: string[] | undefined): string[] {
  if (!talentSkills?.length || !cardSkills?.length) return [];
  return talentSkills
    .filter((s) => skillMatches([s], cardSkills).length > 0)
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
    const o = item as { label?: unknown; source?: unknown } | null;
    if (!o || typeof o.label !== "string") return { ok: false, error: "Each skill needs a label" };
    const label = normaliseSkill(o.label);
    if (!label) return { ok: false, error: "A skill can't be empty" };
    if (o.label.trim().length > MAX_SKILL_LENGTH) return { ok: false, error: `Keep each skill under ${MAX_SKILL_LENGTH} characters` };
    if (o.source !== "cv" && o.source !== "self") return { ok: false, error: "Invalid skill source" };
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = existing?.find((s) => s.label.toLowerCase() === key);
    out.push({ label, source: o.source, addedAt: prev?.addedAt ?? nowIso });
  }
  return { ok: true, skills: out };
}
