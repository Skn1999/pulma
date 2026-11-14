// Pure schedule builder. No I/O, no Next imports.
// Times are treated as local Europe/Helsinki and emitted as ISO strings without a "Z".

import type { DB } from "./types";

export interface Slot {
  meetingId: string;
  cardId: string;
  companyId: string;
  responseId: string;
  talentId: string;
  table: number; // 1-based
  start: string; // "YYYY-MM-DDTHH:MM:SS"
  end: string;
}

export interface Schedule {
  slots: Slot[];
  arrivals: Record<string, string>; // talentId -> ISO
  unscheduled: string[]; // meetingIds
}

const ARRIVAL_LEAD_MINUTES = 15;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoAt(date: string, minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${date}T${pad(h)}:${pad(m)}:00`;
}

function byString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Greedy scheduler. Meetings are processed in id order (deterministic). Each meeting
 * takes the earliest slot where neither its table nor its talent is already busy.
 * Each company has one fixed table: (index in db.companies % tables) + 1.
 */
export function buildSchedule(db: DB): Schedule {
  const ev = db.event;
  const dayStart = toMinutes(ev.startTime);
  const dayEnd = toMinutes(ev.endTime);
  const slotCount = Math.max(0, Math.floor((dayEnd - dayStart) / ev.slotMinutes));

  const cardById = new Map(db.cards.map((c) => [c.id, c]));
  const responseById = new Map(db.responses.map((r) => [r.id, r]));

  const meetings = [...db.meetings].sort((a, b) => byString(a.id, b.id));

  const tableBusy = new Map<number, Set<number>>();
  const talentBusy = new Map<string, Set<number>>();
  const firstSlotIndex = new Map<string, number>();
  const slots: Slot[] = [];
  const unscheduled: string[] = [];

  for (const meeting of meetings) {
    const card = cardById.get(meeting.cardId);
    const response = responseById.get(meeting.responseId);
    const companyIndex = card
      ? db.companies.findIndex((c) => c.id === card.companyId)
      : -1;

    if (!card || !response || companyIndex < 0) {
      unscheduled.push(meeting.id);
      continue;
    }

    const table = (companyIndex % ev.tables) + 1;
    const talentId = response.talentId;
    const tBusy = tableBusy.get(table) ?? new Set<number>();
    const pBusy = talentBusy.get(talentId) ?? new Set<number>();

    let found = -1;
    for (let i = 0; i < slotCount; i++) {
      if (!tBusy.has(i) && !pBusy.has(i)) {
        found = i;
        break;
      }
    }

    if (found < 0) {
      unscheduled.push(meeting.id);
      continue;
    }

    tBusy.add(found);
    pBusy.add(found);
    tableBusy.set(table, tBusy);
    talentBusy.set(talentId, pBusy);

    const startMin = dayStart + found * ev.slotMinutes;
    const prev = firstSlotIndex.get(talentId);
    if (prev === undefined || found < prev) firstSlotIndex.set(talentId, found);

    slots.push({
      meetingId: meeting.id,
      cardId: card.id,
      companyId: card.companyId,
      responseId: response.id,
      talentId,
      table,
      start: isoAt(ev.date, startMin),
      end: isoAt(ev.date, startMin + ev.slotMinutes),
    });
  }

  slots.sort((a, b) => byString(a.start, b.start) || a.table - b.table);

  const arrivals: Record<string, string> = {};
  for (const [talentId, index] of firstSlotIndex) {
    const startMin = dayStart + index * ev.slotMinutes - ARRIVAL_LEAD_MINUTES;
    arrivals[talentId] = isoAt(ev.date, startMin);
  }

  return { slots, arrivals, unscheduled };
}
