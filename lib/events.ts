// Events helpers. Pure: no I/O, no Next imports. `now` is always passed in (ms since epoch).
import type { DB, Event, Meeting, ProblemCard } from "./types";

export function eventById(db: DB, id: string | undefined): Event | undefined {
  return id ? db.events.find((e) => e.id === id) : undefined;
}

function byDate(a: Event, b: Event): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Events sorted by date (ties by id). */
export function sortedEvents(db: DB): Event[] {
  return [...db.events].sort(byDate);
}

/** The earliest event by date, ties by id, skipping finished (done) events when any other exists. Always exists once the DB is seeded. */
export function defaultEvent(db: DB): Event {
  const all = sortedEvents(db);
  return all.find((e) => e.stage !== "done") ?? all[0];
}

/** The event a problem belongs to; a missing or unknown eventId means the default event. */
export function eventOf(db: DB, card: Pick<ProblemCard, "eventId">): Event {
  return eventById(db, card.eventId) ?? defaultEvent(db);
}

export function eventOfMeeting(db: DB, meeting: Meeting): Event {
  const card = db.cards.find((c) => c.id === meeting.cardId);
  return card ? eventOf(db, card) : defaultEvent(db);
}

/** Today's date in Helsinki, "YYYY-MM-DD". */
export function helsinkiToday(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

/** Events whose date is today (Helsinki) or later, sorted by date. */
export function upcomingEvents(db: DB, now: number): Event[] {
  const today = helsinkiToday(now);
  return sortedEvents(db).filter((e) => e.date >= today);
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Sat 5 Dec" for a "YYYY-MM-DD" date. */
export function eventDay(date: string): string {
  return dayFmt.format(new Date(`${date}T00:00:00Z`)).replace(",", "");
}

/** "Espoo Tech Talent Day · Sat 5 Dec · Otaniemi Hall A (demo venue)" */
export function eventLabel(ev: Event): string {
  return `${ev.name} · ${eventDay(ev.date)} · ${ev.venue}`;
}

/** Where and when an event-day meeting happens: "Table 2 at Espoo Tech Talent Day, Sat 5 Dec, Otaniemi Hall A (demo venue)". */
export function tablePlace(ev: Event, table: number): string {
  return `Table ${table} at ${ev.name}, ${eventDay(ev.date)}, ${ev.venue}`;
}

/** The requested event if it is in `list`, else the next upcoming one in `list`, else the first. */
export function pickEvent(db: DB, list: Event[], requested: string | undefined, now: number): Event | undefined {
  const asked = list.find((e) => e.id === requested);
  if (asked) return asked;
  const today = upcomingEvents(db, now).map((e) => e.id);
  return list.find((e) => today.includes(e.id)) ?? list[0];
}

/** Events where this company has a problem or a confirmed place. */
export function eventsOfCompany(db: DB, companyId: string): Event[] {
  const ids = new Set(db.cards.filter((c) => c.companyId === companyId).map((c) => eventOf(db, c).id));
  for (const p of db.participations) if (p.companyId === companyId && p.status === "confirmed") ids.add(p.eventId);
  return sortedEvents(db).filter((e) => ids.has(e.id));
}

/** Events with at least one problem this talent has answered. */
export function eventsOfTalent(db: DB, talentId: string): Event[] {
  const cardIds = new Set(db.responses.filter((r) => r.talentId === talentId).map((r) => r.cardId));
  const ids = new Set(db.cards.filter((c) => cardIds.has(c.id)).map((c) => eventOf(db, c).id));
  return sortedEvents(db).filter((e) => ids.has(e.id));
}
