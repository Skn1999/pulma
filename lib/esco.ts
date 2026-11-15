// ESCO skill suggestions. Server-side, no key needed. Never throws (CLAUDE.md hard rule 7): on any error or timeout
// the bundled list in data/esco-skills.json answers instead.
// Skills data: ESCO, European Commission (https://esco.ec.europa.eu), reused with attribution.
// The bundled list was fetched from the public suggest2 API on 2026-11-15 by scripts/fetch-esco.mjs.
import bundled from "@/data/esco-skills.json";
import type { EscoRef } from "./types";
import { ESCO_URI_PREFIX } from "./esco-ref";

export const ESCO_TIMEOUT_MS = 2500;
const LIMIT = 8;
const CACHE_MAX = 200;

const BUNDLED = bundled as EscoRef[];
const cache = new Map<string, EscoRef[]>(); // insertion order = recency (simple LRU)

/** Words that are not letters or digits split the label; used for case-insensitive prefix matching. */
function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^\p{L}\p{N}+#]+/u).filter(Boolean);
}

/** Case-insensitive prefix / word-prefix match on the bundled list. Whole-label prefix hits come first. */
export function fallbackSuggest(text: string): EscoRef[] {
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];
  const qWords = tokens(q);
  const starts: EscoRef[] = [];
  const words: EscoRef[] = [];
  for (const s of BUNDLED) {
    const l = s.label.toLowerCase();
    if (l.startsWith(q)) starts.push(s);
    else if (qWords.length && qWords.every((w) => tokens(l).some((t) => t.startsWith(w)))) words.push(s);
  }
  return [...starts, ...words].slice(0, LIMIT);
}

function pickLabel(r: { title?: unknown; preferredLabel?: unknown }, lang: string): string {
  const pl = r.preferredLabel && typeof r.preferredLabel === "object" ? (r.preferredLabel as Record<string, unknown>) : {};
  const own = lang !== "en" && typeof pl[lang] === "string" ? (pl[lang] as string) : "";
  const title = typeof r.title === "string" ? r.title : "";
  const en = typeof pl.en === "string" ? (pl.en as string) : "";
  return (own || title || en).trim();
}

async function fetchLive(text: string, lang: string): Promise<EscoRef[]> {
  const url = `https://ec.europa.eu/esco/api/suggest2?text=${encodeURIComponent(text)}&type=skill&language=${encodeURIComponent(lang)}&limit=${LIMIT}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ESCO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`ESCO ${res.status}`);
    const data = (await res.json()) as { _embedded?: { results?: { uri?: unknown; title?: unknown; preferredLabel?: unknown }[] } };
    const out: EscoRef[] = [];
    for (const r of data?._embedded?.results ?? []) {
      const label = pickLabel(r, lang).slice(0, 80);
      if (typeof r.uri === "string" && r.uri.startsWith(ESCO_URI_PREFIX) && label && !out.some((o) => o.uri === r.uri)) out.push({ uri: r.uri, label });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

/** Up to 8 ESCO skills for what the person typed. Live API first (2.5s timeout, cached), bundled list otherwise. Never throws. */
export async function suggestSkills(text: string, lang = "en"): Promise<EscoRef[]> {
  const q = String(text ?? "").trim().slice(0, 60);
  if (q.length < 2) return [];
  const language = /^[a-z]{2}$/.test(lang) ? lang : "en";
  const key = `${language}:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  try {
    const live = await fetchLive(q, language);
    if (live.length) {
      cache.set(key, live);
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
      return live;
    }
  } catch {
    // network error, timeout or odd payload: use the bundled list
  }
  return fallbackSuggest(q);
}

/** Test helper. */
export function clearEscoCache(): void {
  cache.clear();
}

const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** A bundled skill whose label equals `label` (ignoring case and a trailing "(computer programming)"). For seeds. */
export function escoExact(label: string): EscoRef | undefined {
  const n = norm(label);
  return BUNDLED.find((s) => norm(s.label) === n);
}

/**
 * The best ESCO match for a CV suggestion: the first suggest2 hit, kept only if it is clearly the same skill
 * (one label contains the other), so a loose hit never tags a skill wrongly. The person still accepts each skill.
 */
export async function bestEscoMatch(label: string): Promise<EscoRef | undefined> {
  const hits = await suggestSkills(label);
  const n = norm(label);
  return hits.find((h) => {
    const m = norm(h.label);
    return m === n || m.startsWith(n) || n.startsWith(m);
  });
}
