// Meeting times outside the event day. Pure. Local times are Europe/Helsinki strings "YYYY-MM-DDTHH:MM:00".
import { goalOf } from "./deadlines";
import type { DB, Meeting, MeetMode } from "./types";

export const OFF_EVENT_MINUTES = 30;
const LEAD_MINUTES = 120; // earliest bookable slot is 2 hours from now

const pad = (n: number) => String(n).padStart(2, "0");

/** Current Helsinki wall-clock time as "YYYY-MM-DDTHH:MM:00". */
export function localNow(now: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:00`;
}

/** Add minutes to a local time string (no timezone maths: wall-clock arithmetic). */
export function addMinutesLocal(local: string, minutes: number): string {
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da, h, mi + minutes));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00`;
}

export function meetingMode(m: Meeting): MeetMode {
  return m.mode ?? "event";
}

export function meetingStatus(m: Meeting): "pending" | "booked" | "reschedule" | "cancelled" {
  return m.status ?? (m.slotStart ? "booked" : "pending");
}

export function meetingEnd(db: DB, m: Meeting): string {
  const mins = m.durationMin ?? (meetingMode(m) === "event" ? db.event.slotMinutes : OFF_EVENT_MINUTES);
  return addMinutesLocal(m.slotStart, mins);
}

const overlaps = (a0: string, a1: string, b0: string, b1: string) => a0 < b1 && b0 < a1;

export interface SlotOption {
  mode: MeetMode;
  start?: string; // missing for "event": the event-day scheduler assigns the table and time
  end?: string;
  place?: string;
}

/**
 * Times the talent can pick for this meeting: the event day (if the problem offers it and the event is
 * still ahead), plus free 30-minute slots inside the company's office/video windows. A slot is free when
 * neither the company nor this talent already has a booked meeting overlapping it.
 */
export function slotOptions(db: DB, meetingId: string, now: number): SlotOption[] {
  const meeting = db.meetings.find((m) => m.id === meetingId);
  if (!meeting) return [];
  const card = db.cards.find((c) => c.id === meeting.cardId);
  const response = db.responses.find((r) => r.id === meeting.responseId);
  if (!card || !response) return [];
  const company = db.companies.find((c) => c.id === card.companyId);
  const modes = goalOf(card, db).meetModes;
  const nowLocal = localNow(now);
  const earliest = addMinutesLocal(nowLocal, LEAD_MINUTES);
  const out: SlotOption[] = [];

  if (modes.includes("event") && `${db.event.date}T${db.event.endTime}:00` > nowLocal) out.push({ mode: "event" });

  // Busy intervals: the company's booked meetings (any card) and the talent's booked meetings (any company).
  const companyCards = new Set(db.cards.filter((c) => c.companyId === card.companyId).map((c) => c.id));
  const busy: [string, string][] = [];
  for (const m of db.meetings) {
    if (m.id === meeting.id || !m.slotStart || meetingStatus(m) !== "booked") continue;
    const r = db.responses.find((x) => x.id === m.responseId);
    if (companyCards.has(m.cardId) || r?.talentId === response.talentId) busy.push([m.slotStart, meetingEnd(db, m)]);
  }

  const windows = db.availability
    .filter((w) => w.companyId === card.companyId && modes.includes(w.mode))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  for (const w of windows) {
    for (let s = w.start; addMinutesLocal(s, OFF_EVENT_MINUTES) <= w.end; s = addMinutesLocal(s, OFF_EVENT_MINUTES)) {
      const e = addMinutesLocal(s, OFF_EVENT_MINUTES);
      if (s < earliest) continue;
      if (busy.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
      out.push({ mode: w.mode, start: s, end: e, place: placeFor(w.mode, company?.office, meeting.id) });
    }
  }
  return out;
}

/** Office address, or a fake video link that is stable per meeting. */
export function placeFor(mode: MeetMode, office: string | undefined, meetingId: string): string | undefined {
  if (mode === "office") return office ?? "Office address shared by the company";
  if (mode === "video") return `https://meet.example/pulma-${meetingId.replace(/[^a-z0-9]/gi, "").slice(-8)}`;
  return undefined;
}

/** Is this exact option still free? Used by the booking route to reject stale picks. */
export function isOptionFree(db: DB, meetingId: string, mode: MeetMode, start: string | undefined, now: number): boolean {
  return slotOptions(db, meetingId, now).some((o) => o.mode === mode && (mode === "event" || o.start === start));
}
