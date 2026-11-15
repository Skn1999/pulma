// Builds data/esco-skills.json: the bundled offline list of ESCO skills used when the live API is unreachable.
// Run: node scripts/fetch-esco.mjs   (needs network; the result is committed)
// Terms come from FALLBACK_VOCAB (lib/skills.ts) plus the seeded "Work involved" tags and talent skills (data/seed.ts).
// Skills data: ESCO, European Commission (https://esco.ec.europa.eu). Reused with attribution.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

function vocab() {
  const m = read("lib/skills.ts").match(/FALLBACK_VOCAB = \[([\s\S]*?)\];/);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}
function seedTerms() {
  const seed = read("data/seed.ts");
  const block = seed.match(/CARD_SKILLS[^=]*= \{([\s\S]*?)\n\};/)[1];
  const tags = [...block.matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((t) => !t.startsWith("card-"));
  const talent = [...seed.matchAll(/label: "([^"]+)", source:/g)].map((x) => x[1]);
  return [...tags, ...talent];
}

// A few extra stems so the offline list also answers common half-typed words (suggest2 matches prefixes).
const EXTRA = ["analyse data", "data", "machine learning", "spreadsheet", "database", "version control", "web", "mobile", "sensor", "test", "write", "teach", "coach", "translat", "interview", "present", "customer", "user", "game", "robot", "battery", "warehouse", "logistic", "manage", "plan", "communicat", "design", "document", "report", "problem", "analys", "quality", "safety"];
const all = [...new Set([...vocab(), ...seedTerms(), ...EXTRA])];
// Each term, plus its longer words on their own (suggest2 matches prefixes, so "Battery data analysis" alone finds little).
const GENERIC = new Set(["process", "support", "research", "design", "machine", "engineering", "public", "product", "quality", "writing", "technical", "level", "systems", "safety", "project", "patient", "training", "learning", "experiments", "procedures", "management", "operations", "sensor", "customer", "analysis"]);
const words = (t) => t.split(/\s+/).filter((w) => w.length >= 5 && !GENERIC.has(w.toLowerCase()));
const terms = [...new Set(all.flatMap((t) => [t, ...words(t)]))];
const isWhole = new Set(all);
const byUri = new Map();
const PER_TERM = 8;

async function suggest(text) {
  const url = `https://ec.europa.eu/esco/api/suggest2?text=${encodeURIComponent(text)}&type=skill&language=en&limit=8`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  return (data._embedded?.results ?? []).map((r) => ({
    uri: r.uri,
    label: r.title || r.preferredLabel?.en || Object.values(r.preferredLabel ?? {})[0],
  })).filter((r) => r.uri && r.label);
}

let failed = 0;
for (const term of terms) {
  try {
    for (const hit of (await suggest(term)).slice(0, isWhole.has(term) ? PER_TERM : 3)) if (!byUri.has(hit.uri)) byUri.set(hit.uri, hit.label);
  } catch (e) {
    failed++;
    console.warn(`skip "${term}": ${e.message}`);
  }
}
const list = [...byUri].map(([uri, label]) => ({ uri, label })).sort((a, b) => a.label.localeCompare(b.label, "en"));
if (list.length < 50) throw new Error(`Only ${list.length} skills fetched; not overwriting the bundled list.`);
writeFileSync(join(root, "data/esco-skills.json"), JSON.stringify(list, null, 1) + "\n");
console.log(`${terms.length} terms, ${failed} failed, ${list.length} skills written (fetched ${new Date().toISOString().slice(0, 10)})`);
