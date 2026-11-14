// Event-day identity card. Pure: no I/O, no Next imports. `now` is passed in (ms since epoch).
// The card exists only for a booked event-day meeting with a table and time, i.e. after the company
// shortlisted AND the candidate accepted. It carries first names and a few chosen skills, nothing else.
import { eventDay, eventOfMeeting, helsinkiToday } from "./events";
import type { Account, DB, Meeting } from "./types";

export const MAX_CARD_SKILLS = 3;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 characters: A-Z without I and O, digits 2-9

/** Stable 6-character code from the meeting id, e.g. "K7QZ3M". Shown as "PUL-K7QZ3M". Not a secret. */
export function meetCode(meeting: Pick<Meeting, "id">): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < meeting.id.length; i++) {
    h ^= meeting.id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // murmur3 finaliser spreads small id differences over all bits
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[(h >>> (i * 5)) & 31];
  return out;
}

export function firstName(full: string | undefined): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

export interface EventCard {
  meetingId: string;
  code: string;
  eventName: string;
  eventDate: string; // "YYYY-MM-DD"
  dayLabel: string; // "Sat 5 Dec"
  venue: string;
  table: number;
  time: string; // "HH:MM"
  problemTitle: string;
  companyName: string;
  companyFirstName: string; // the hiring contact; "" if unknown
  talentFirstName: string;
  skills: string[]; // only the ones the candidate chose and still keeps
  expired: boolean; // after the event date (Helsinki)
}

/** The card for a meeting, or null when none may exist yet (not event-day, not booked, no table/time, missing data). */
export function eventCardFor(db: DB, meetingId: string, now: number): EventCard | null {
  const m = db.meetings.find((x) => x.id === meetingId);
  if (!m) return null;
  if ((m.mode ?? "event") !== "event") return null;
  if ((m.status ?? "booked") !== "booked") return null;
  if (!m.slotStart || !(m.table > 0)) return null;
  const response = db.responses.find((r) => r.id === m.responseId);
  const card = db.cards.find((c) => c.id === m.cardId);
  if (!response || !card) return null;
  // Both sides must have opted in: the company shortlisted this answer and the candidate accepted.
  const accepted = db.shortlists.some((s) => s.responseId === response.id && s.cardId === card.id && s.status === "accepted");
  if (!accepted) return null;
  const talent = db.talents.find((t) => t.id === response.talentId);
  const company = db.companies.find((c) => c.id === card.companyId);
  if (!talent || !company) return null;
  const ev = eventOfMeeting(db, m);
  const contact = db.accounts.find((a) => a.role === "company" && a.companyId === company.id);
  const own = new Set((talent.skills ?? []).map((s) => s.label));
  return {
    meetingId: m.id,
    code: meetCode(m),
    eventName: ev.name,
    eventDate: ev.date,
    dayLabel: eventDay(ev.date),
    venue: ev.venue,
    table: m.table,
    time: m.slotStart.slice(11, 16),
    problemTitle: card.title,
    companyName: company.name,
    companyFirstName: firstName(contact?.displayName),
    talentFirstName: firstName(talent.displayName),
    skills: (m.cardSkills ?? []).filter((s) => own.has(s)).slice(0, MAX_CARD_SKILLS),
    expired: helsinkiToday(now) > ev.date,
  };
}

/** Who may open the card: the candidate who owns the meeting, the company that owns the problem, or the organiser. */
export function cardViewerSide(db: DB, acc: Account, meetingId: string): "talent" | "company" | "organiser" | null {
  if (acc.role === "organiser") return "organiser";
  const m = db.meetings.find((x) => x.id === meetingId);
  if (!m) return null;
  if (acc.role === "talent") {
    const r = db.responses.find((x) => x.id === m.responseId);
    return r && acc.talentId === r.talentId ? "talent" : null;
  }
  const card = db.cards.find((c) => c.id === m.cardId);
  return card && acc.companyId === card.companyId ? "company" : null;
}

export type CardSkillsInput = { ok: true; skills: string[] } | { ok: false; error: string };

/** Strict check of `{ skills: string[] }`: array of at most 3 distinct strings, each one of the talent's own labels. */
export function parseCardSkills(body: unknown, ownLabels: string[]): CardSkillsInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Send an object with skills" };
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "skills") return { ok: false, error: "Only skills can be set" };
  const skills = (body as { skills: unknown }).skills;
  if (!Array.isArray(skills)) return { ok: false, error: "skills must be a list" };
  if (skills.length > MAX_CARD_SKILLS) return { ok: false, error: `Choose at most ${MAX_CARD_SKILLS} skills` };
  const seen = new Set<string>();
  for (const s of skills) {
    if (typeof s !== "string" || !ownLabels.includes(s)) return { ok: false, error: "Each skill must be one of your own skills" };
    if (seen.has(s)) return { ok: false, error: "Each skill can be shown once" };
    seen.add(s);
  }
  return { ok: true, skills: skills as string[] };
}
