// Pure organiser statistics. No I/O, no Next imports.
// Everything here counts published cards only. noInvite is a follow-up cue, never a ranking.

import { eventOf } from "./events";
import type { DB } from "./types";

export interface Stats {
  counts: { cards: number; responses: number; shortlists: number; meetings: number };
  sectors: { name: string; count: number }[];
  languages: { name: string; count: number }[];
  timeline: { cardId: string; title: string; createdAt: string; daysBeforeEvent: number }[];
  followUps: { meetings: number; answered: number; mutualNextSteps: number };
  replies: { answers: number; shortlisted: number; closed: number; open: number; replyRate: number };
  noInvite: { responseId: string; publicCode: string; cardTitle: string; talentId: string }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function byString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSortedCounts(map: Map<string, number>): { name: string; count: number }[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || byString(a.name, b.name));
}

/** Whole days from the date part of `from` to the date `to` (YYYY-MM-DD). Positive = `from` is earlier. */
function daysBetween(from: string, to: string): number {
  const fromMs = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const toMs = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((toMs - fromMs) / DAY_MS);
}

/** Statistics for published cards; pass an eventId to limit everything to that event's problems. */
export function getStats(db: DB, eventId?: string): Stats {
  const published = db.cards.filter((c) => c.status === "published" && (!eventId || eventOf(db, c).id === eventId));
  const publishedIds = new Set(published.map((c) => c.id));

  const companyById = new Map(db.companies.map((c) => [c.id, c]));
  const responses = db.responses.filter((r) => publishedIds.has(r.cardId));
  const shortlists = db.shortlists.filter((s) => publishedIds.has(s.cardId));
  const meetings = db.meetings.filter((m) => publishedIds.has(m.cardId));

  const sectorCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();
  for (const card of published) {
    const company = companyById.get(card.companyId);
    if (company) increment(sectorCounts, company.sector);
    for (const language of card.languages) increment(languageCounts, language);
  }

  const timeline = [...published]
    .sort((a, b) => byString(a.createdAt, b.createdAt))
    .map((card) => ({
      cardId: card.id,
      title: card.title,
      createdAt: card.createdAt,
      daysBeforeEvent: daysBetween(card.createdAt, eventOf(db, card).date),
    }));

  const shortlistedResponseIds = new Set(db.shortlists.map((s) => s.responseId));
  const cardTitleById = new Map(published.map((c) => [c.id, c.title]));
  const noInvite = responses
    .filter((r) => !shortlistedResponseIds.has(r.id))
    .sort(
      (a, b) =>
        byString(a.cardId, b.cardId) ||
        a.publicCode.localeCompare(b.publicCode, undefined, { numeric: true }),
    )
    .map((r) => ({
      responseId: r.id,
      publicCode: r.publicCode,
      cardTitle: cardTitleById.get(r.cardId) ?? "",
      talentId: r.talentId,
    }));

  const meetingIds = new Set(meetings.map((m) => m.id));
  const answeredIds = new Set<string>();
  const nextStepSides = new Map<string, Set<string>>();
  for (const f of db.feedback ?? []) {
    if (!meetingIds.has(f.meetingId)) continue;
    answeredIds.add(f.meetingId);
    if (f.outcome === "next-step") {
      const sides = nextStepSides.get(f.meetingId) ?? new Set<string>();
      sides.add(f.side);
      nextStepSides.set(f.meetingId, sides);
    }
  }
  const mutualNextSteps = [...nextStepSides.values()].filter((s) => s.size === 2).length;

  const shortlistedIds = new Set(shortlists.map((s) => s.responseId));
  const closedIds = new Set((db.closures ?? []).map((c) => c.responseId));
  const responseIds = new Set(responses.map((r) => r.id));
  let shortlistedN = 0;
  let closedN = 0;
  for (const id of responseIds) {
    if (shortlistedIds.has(id)) shortlistedN++;
    else if (closedIds.has(id)) closedN++;
  }
  const answeredN = shortlistedN + closedN;
  const replies = {
    answers: responses.length,
    shortlisted: shortlistedN,
    closed: closedN,
    open: responses.length - answeredN,
    replyRate: responses.length ? answeredN / responses.length : 0,
  };

  return {
    counts: {
      cards: published.length,
      responses: responses.length,
      shortlists: shortlists.length,
      meetings: meetings.length,
    },
    sectors: toSortedCounts(sectorCounts),
    languages: toSortedCounts(languageCounts),
    timeline,
    followUps: { meetings: meetings.length, answered: answeredIds.size, mutualNextSteps },
    replies,
    noInvite,
  };
}
