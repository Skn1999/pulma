// Server-only AI helpers. Every function returns a fallback and never throws.
// AI only helps people write; it never ranks, scores or filters people (CLAUDE.md hard rule 1).
import Anthropic from "@anthropic-ai/sdk";
import type { CardDraft, Format, IntakeAnswers } from "./types";
import { CARD_SYSTEM, CLARITY_SYSTEM, SKILLS_SYSTEM, cardUserMessage } from "./prompts";
import { MAX_SKILL_LENGTH, fallbackExtract, normaliseSkill } from "./skills";

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 1200;
const TIMEOUT_MS = 8000;
const CLARITY_MAX_CHARS = 600;
const FORMATS: Format[] = ["onsite", "online", "hybrid"];
const KNOWN_LANGUAGES = [
  "English", "Finnish", "Swedish", "Ukrainian", "Spanish", "Russian", "German", "French",
  "Estonian", "Arabic", "Chinese", "Japanese", "Italian", "Portuguese", "Polish", "Hindi",
  "Persian", "Turkish", "Vietnamese", "Dutch",
];
// Patterns that signal demographic or discriminating requirements. Experience and degrees are fine; these are not.
const DEMOGRAPHIC_HINT =
  /\bnative\b|\bnationalit|\bcitizen|\bage[ds]?\s+\d|\bunder\s+\d{2}\b|\byoung\b|\brecent graduate|\bdigital native|\bgender\b|\b(male|female|man|woman)\b|\breligio|\bmarried\b|\bchildren\b|\bpregnan|\bethnic|\bphoto\b|\bhealthy\b/i;

type CardResult = { draft: CardDraft; suggestions: string[]; fallback: boolean };

function client(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
}

/** One Claude call. Returns trimmed text, or null on any failure or missing key. */
async function complete(system: string, user: string): Promise<string | null> {
  try {
    const api = client();
    if (!api) return null;
    const res = await api.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Takes the first {...} in the model output, tolerating ```json fences. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(cleaned.slice(start, end + 1));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function cleanList(v: unknown, maxItems: number, maxLen = 160): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => cleanString(x, maxLen))
    .filter((x): x is string => x !== null)
    .slice(0, maxItems);
}

/** Case-insensitive de-duplication, keeping first spelling and order. */
function dedupe(xs: string[]): string[] {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Maps "english" or "FINNISH" to the canonical name from KNOWN_LANGUAGES; other names are kept as typed. */
function canonLanguage(name: string): string {
  return KNOWN_LANGUAGES.find((k) => k.toLowerCase() === name.toLowerCase()) ?? name;
}

/**
 * Makes languages consistent: `languages` is non-empty, `languagesNeeded` is a non-empty subset of it.
 * Unclear needs default to English (CLAUDE.md: never mark a language needed just because it is the office language).
 */
function resolveLanguages(
  languagesRaw: string[],
  neededRaw: string[] | null,
): { languages: string[]; languagesNeeded: string[] } {
  let languages = dedupe(languagesRaw.map(canonLanguage));
  if (!languages.length) languages = ["English"];
  let needed = neededRaw
    ? dedupe(neededRaw.map(canonLanguage)).filter((l) => languages.includes(l))
    : [];
  if (!needed.length) {
    needed = ["English"];
    if (!languages.includes("English")) languages = [...languages, "English"];
  }
  return { languages, languagesNeeded: needed };
}

/** Gentle, human-facing question when Finnish or Swedish is needed. Shown as a suggestion, never applied. */
const SOCIAL_LANGUAGE_NUDGE = (lang: string) =>
  `Is ${lang} needed for the work itself, or for the team's social life? Many teams start in English.`;

function validateCard(obj: Record<string, unknown>): CardResult | null {
  const d = obj.draft;
  if (!d || typeof d !== "object") return null;
  const r = d as Record<string, unknown>;
  const title = cleanString(r.title, 120);
  const context = cleanString(r.context, 1000);
  const weekOneReality = cleanString(r.weekOneReality, 1000);
  const hardPart = cleanString(r.hardPart, 1000);
  if (!title || !context || !weekOneReality || !hardPart) return null;

  const format = FORMATS.includes(r.format as Format) ? (r.format as Format) : "hybrid";
  const declaredNeeded = Array.isArray(r.languagesNeeded) ? cleanList(r.languagesNeeded, 6, 40) : null;
  const { languages, languagesNeeded } = resolveLanguages(cleanList(r.languages, 6, 40), declaredNeeded);

  return {
    draft: {
      title,
      context,
      weekOneReality,
      hardPart,
      niceToHave: cleanList(r.niceToHave, 8),
      languages,
      languagesNeeded,
      skills: dedupe(cleanList(r.skills, 6, MAX_SKILL_LENGTH)),
      format,
    },
    suggestions: cleanList(obj.suggestions, 4, 300),
    fallback: false,
  };
}

/**
 * Offline parse of the free-text language answer. Clauses are split on punctuation and "but"/"while",
 * so "English needed; Finnish nice to have" gives English needed and Finnish nice to have.
 */
function parseLanguageAnswer(text: string): { mentioned: string[]; needed: string[] } {
  const mentioned: string[] = [];
  const needed: string[] = [];
  const NICE = /\b(nice|plus|bonus|optional|preferred|helpful)\b|\bnot\s+(strictly\s+)?(needed|required|necessary)\b/i;
  const NEEDED = /\b(needed|need|must|required|require|requires|essential|mandatory)\b/i;
  for (const clause of text.split(/[,;.\n]+|\bbut\b|\bwhile\b/i)) {
    const found = KNOWN_LANGUAGES.filter((lang) => new RegExp(`\\b${lang}\\b`, "i").test(clause));
    if (!found.length) continue;
    mentioned.push(...found);
    if (NICE.test(clause)) continue;
    if (NEEDED.test(clause)) needed.push(...found);
  }
  return { mentioned: dedupe(mentioned), needed: dedupe(needed) };
}

function normalise(a: Partial<IntakeAnswers> | undefined): IntakeAnswers {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    problem: s(a?.problem),
    firstWeek: s(a?.firstWeek),
    hardPart: s(a?.hardPart),
    bonus: s(a?.bonus),
    languages: s(a?.languages),
  };
}

function fallbackCard(a: IntakeAnswers): CardResult {
  const firstSentence = (text: string) => {
    const first = text.split(/[.!?\n]/)[0]?.trim() ?? "";
    if (!first) return "Untitled problem";
    return first.length > 70 ? first.slice(0, 70).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + "…" : first;
  };

  const parsed = parseLanguageAnswer(a.languages);
  // Nothing marked as needed: the first language mentioned is needed, or English if none is mentioned.
  const { languages, languagesNeeded } = resolveLanguages(
    parsed.mentioned,
    parsed.needed.length ? parsed.needed : parsed.mentioned.slice(0, 1),
  );
  const all = [a.problem, a.firstWeek, a.hardPart, a.bonus, a.languages].join(" ");

  const suggestions: string[] = [];
  if (DEMOGRAPHIC_HINT.test(all)) {
    suggestions.push(
      "Age, nationality, gender, 'native speaker' or family details can lead to discrimination, so they are left out of the card. Try describing what the work needs instead, e.g. which language the person will use and with whom.",
    );
  }
  const socialNeeded = languagesNeeded.find((l) => l === "Finnish" || l === "Swedish");
  if (socialNeeded) suggestions.push(SOCIAL_LANGUAGE_NUDGE(socialNeeded));

  return {
    draft: {
      title: firstSentence(a.problem),
      context: a.problem || "The team has not described this problem yet.",
      weekOneReality: a.firstWeek || "The first week is not described yet.",
      hardPart: a.hardPart || "The hard part is not described yet.",
      niceToHave: a.bonus
        .split(/[\n,;]+|\band\b/i)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      languages,
      languagesNeeded,
      skills: fallbackExtract(all).slice(0, 6),
      format: "hybrid",
    },
    suggestions: suggestions.slice(0, 4),
    fallback: true,
  };
}

export async function generateProblemCard(
  a: IntakeAnswers,
): Promise<{ draft: CardDraft; suggestions: string[]; fallback: boolean }> {
  const answers = normalise(a);
  try {
    const raw = await complete(CARD_SYSTEM, cardUserMessage(answers));
    const obj = raw ? parseJsonObject(raw) : null;
    const card = obj ? validateCard(obj) : null;
    if (card) return card;
  } catch {
    // fall through to the deterministic card
  }
  return fallbackCard(answers);
}

export async function suggestClarity(
  text: string,
): Promise<{ suggestion: string | null; fallback: boolean }> {
  const input = typeof text === "string" ? text.trim() : "";
  if (!input) return { suggestion: null, fallback: true };
  const out = await complete(CLARITY_SYSTEM, input);
  if (!out || out.length > CLARITY_MAX_CHARS) return { suggestion: null, fallback: true };
  return { suggestion: out, fallback: false };
}

/**
 * Suggests skills from CV text. The text is used for this one call only: it is not stored, not logged.
 * Suggestions are the person's to accept or dismiss; nothing is saved here.
 */
export async function extractSkills(text: string): Promise<{ suggestions: string[]; fallback: boolean }> {
  const input = typeof text === "string" ? text.trim() : "";
  if (!input) return { suggestions: [], fallback: true };
  try {
    const raw = await complete(SKILLS_SYSTEM, input);
    const obj = raw ? parseJsonObject(raw) : null;
    const list = obj ? dedupe(cleanList(obj.skills, 12, MAX_SKILL_LENGTH).map(normaliseSkill).filter(Boolean)) : [];
    if (list.length) return { suggestions: list, fallback: false };
  } catch {
    // fall through to the offline vocabulary
  }
  return { suggestions: fallbackExtract(input), fallback: true };
}
