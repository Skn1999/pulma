// Who takes part in which event, and what the event stage allows. Pure: `now` is passed in.
import { eventById, eventOf, helsinkiToday } from "./events";
import { meetingMode, meetingStatus } from "./slots";
import { MAX_PROBLEMS_PER_EVENT, type DB, type Event, type EventStage, type Participation, type ProblemCard } from "./types";

export const STAGE_LABEL: Record<EventStage, string> = { draft: "Draft", open: "Open", locked: "Locked", done: "Done" };

export function participationOf(db: DB, eventId: string, companyId: string): Participation | undefined {
  return db.participations.find((p) => p.eventId === eventId && p.companyId === companyId);
}

/** Events this company has accepted (confirmed), by date. */
export function confirmedEvents(db: DB, companyId: string): Event[] {
  return db.participations
    .filter((p) => p.companyId === companyId && p.status === "confirmed")
    .map((p) => eventById(db, p.eventId))
    .filter((e): e is Event => !!e)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/** The stored stage, except that an event whose date has passed always reads as done. */
export function eventStage(ev: Event, now: number): EventStage {
  return ev.date < helsinkiToday(now) ? "done" : ev.stage;
}

/** Candidates see problems only of open or locked events. Draft events stay with the organiser. */
export function visibleToCandidates(ev: Event, now: number): boolean {
  const s = eventStage(ev, now);
  return s === "open" || s === "locked";
}

/** Published problems a candidate may see: their event is open or locked. */
export function candidateVisibleCards(db: DB, now: number): ProblemCard[] {
  return db.cards.filter((c) => c.status === "published" && visibleToCandidates(eventOf(db, c), now));
}

/** Answers and invites are accepted only while the card's event is open. */
export function eventTakesAnswers(db: DB, card: ProblemCard, now: number): boolean {
  return eventStage(eventOf(db, card), now) === "open";
}

export const ANSWERS_CLOSED = "Answers for this event have closed.";

export function publishedCountIn(db: DB, companyId: string, eventId: string): number {
  return db.cards.filter((c) => c.companyId === companyId && c.status === "published" && eventOf(db, c).id === eventId).length;
}

export function canPublishTo(db: DB, companyId: string, eventId: string, now: number): { ok: true } | { ok: false; reason: string } {
  const ev = eventById(db, eventId);
  if (!ev) return { ok: false, reason: "This event doesn't exist." };
  const p = participationOf(db, eventId, companyId);
  if (!p || p.status !== "confirmed") return { ok: false, reason: "You haven't accepted an invitation to this event." };
  const stage = eventStage(ev, now);
  if (stage === "draft") return { ok: false, reason: "This event isn't open yet." };
  if (stage === "locked") return { ok: false, reason: "This event is locked, so no new problems can be added." };
  if (stage === "done") return { ok: false, reason: "This event is over." };
  if (helsinkiToday(now) > ev.problemDeadline) return { ok: false, reason: "The problem deadline for this event has passed." };
  if (publishedCountIn(db, companyId, eventId) >= MAX_PROBLEMS_PER_EVENT) {
    return { ok: false, reason: `You have already published ${MAX_PROBLEMS_PER_EVENT} problems for this event.` };
  }
  return { ok: true };
}

/** Lowest table number not held by a confirmed company, or undefined when all are taken. */
export function freeTable(db: DB, eventId: string): number | undefined {
  const ev = eventById(db, eventId);
  if (!ev) return undefined;
  const held = new Set(db.participations.filter((p) => p.eventId === eventId && p.status === "confirmed").map((p) => p.table));
  for (let t = 1; t <= ev.tables; t++) if (!held.has(t)) return t;
  return undefined;
}

/** Tables minus confirmed and still-open invitations. */
export function seatsLeft(db: DB, eventId: string): number {
  const ev = eventById(db, eventId);
  if (!ev) return 0;
  const used = db.participations.filter((p) => p.eventId === eventId && (p.status === "confirmed" || p.status === "invited")).length;
  return ev.tables - used;
}

/** True when the company has a booked event-day meeting for a problem in this event. */
export function hasBookedMeetings(db: DB, eventId: string, companyId: string): boolean {
  const ids = new Set(db.cards.filter((c) => c.companyId === companyId && eventOf(db, c).id === eventId).map((c) => c.id));
  return db.meetings.some((m) => ids.has(m.cardId) && meetingMode(m) === "event" && meetingStatus(m) === "booked");
}

/** Allowed organiser stage moves. open → done only once the date has passed (always reads done then anyway). */
export function canMoveStage(from: EventStage, to: EventStage, ev: Event, now: number): boolean {
  if (from === "draft" && to === "open") return true;
  if (from === "open" && to === "locked") return true;
  if (from === "locked" && to === "open") return true;
  if (from === "locked" && to === "done") return true;
  if (from === "open" && to === "done") return ev.date < helsinkiToday(now);
  return false;
}
