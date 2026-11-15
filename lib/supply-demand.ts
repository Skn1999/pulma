// Organiser "supply vs demand" for skills. Counts only: no person, no list of people, ever.
// Demand = this event's published problems that need a skill. Supply = candidates who answered a problem in this
// event and keep that skill. Any supply under MIN_SUPPLY is returned as null ("fewer than 5"), so a small number
// can never point at one person. Same matching rule as Explore (ESCO uri first, then the visible word rule).
import { eventOf } from "./events";
import { skillMatches } from "./skills";
import type { DB, EscoRef } from "./types";

export const MIN_SUPPLY = 5;
export const TOP_N = 10;

export interface SkillRow {
  label: string;
  esco: boolean;
  demand: number; // problems in this event that need it
  supply: number | null; // candidates who list it, or null when fewer than MIN_SUPPLY
}

export const supplyText = (supply: number | null): string => (supply === null ? `fewer than ${MIN_SUPPLY}` : String(supply));

export function skillSupplyDemand(db: DB, eventId: string): SkillRow[] {
  const cards = db.cards.filter((c) => c.status === "published" && eventOf(db, c).id === eventId);
  const cardIds = new Set(cards.map((c) => c.id));
  const talentIds = new Set(db.responses.filter((r) => cardIds.has(r.cardId)).map((r) => r.talentId));
  const pool = db.talents.filter((t) => talentIds.has(t.id) && t.skills?.length);

  const demand = new Map<string, { label: string; esco?: EscoRef; count: number }>();
  for (const c of cards) {
    const seen = new Set<string>();
    for (const tag of c.skills ?? []) {
      const esco = c.skillRefs?.find((r) => r.label.toLowerCase() === tag.toLowerCase())?.esco;
      const key = esco ? esco.uri : `label:${tag.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const row = demand.get(key) ?? { label: esco?.label ?? tag, esco, count: 0 };
      row.count += 1;
      demand.set(key, row);
    }
  }

  return [...demand.values()]
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
    .slice(0, TOP_N)
    .map((d) => {
      const refs = d.esco ? [{ label: d.label, esco: d.esco }] : undefined;
      const n = pool.filter((t) => skillMatches(t.skills, [d.label], refs).length > 0).length;
      return { label: d.label, esco: !!d.esco, demand: d.count, supply: n < MIN_SUPPLY ? null : n };
    });
}
