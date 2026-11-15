// Meetings grouped by the event their problem belongs to, for the Meetings pages of both sides. Pure.
// Privacy: a company sees a candidate's name only for meetings, which exist only after the candidate accepted.
import type { DB, Event, Meeting, MeetMode } from "./types";
import { eventOf, helsinkiToday, sortedEvents } from "./events";
import { buildSchedule, tableOf } from "./schedule";
import { meetingEnd, meetingMode, meetingStatus } from "./slots";

export type Viewer = { role: "talent"; talentId: string } | { role: "company"; companyId: string };

export interface MeetingRow {
  meeting: Meeting;
  mode: MeetMode;
  status: "pending" | "booked" | "reschedule" | "cancelled";
  start?: string; // local "YYYY-MM-DDTHH:MM:00" when booked with a time
  end?: string;
  table?: number;
  cardId: string;
  cardTitle: string;
  responseId: string;
  publicCode: string;
  counterpart: string; // company name (candidate's view) or candidate name (company's view)
}

export interface EventMeetings {
  event: Event;
  past: boolean;
  /** Event-day table meetings with a time, in time order. */
  eventDay: MeetingRow[];
  /** Office and video meetings with a time, in time order. */
  elsewhere: MeetingRow[];
  /** Still needs a time (to pick, or moved), or an event-day meeting whose slot isn't set yet. */
  toArrange: MeetingRow[];
  /** Cancelled (candidate's view only, so they know). */
  cancelled: MeetingRow[];
  /** Candidate: suggested arrival time on the event day. */
  arrival?: string;
  /** Company: its table at the event. */
  table?: number;
}

const byStart = (a: MeetingRow, b: MeetingRow) => ((a.start ?? "") < (b.start ?? "") ? -1 : (a.start ?? "") > (b.start ?? "") ? 1 : 0);

/** The viewer's meetings, one group per event (upcoming by date first, then past ones, most recent first). */
export function meetingsByEvent(db: DB, viewer: Viewer, now: number): EventMeetings[] {
  const today = helsinkiToday(now);
  const groups = new Map<string, EventMeetings>();

  for (const m of db.meetings) {
    const card = db.cards.find((c) => c.id === m.cardId);
    const r = db.responses.find((x) => x.id === m.responseId);
    if (!card || !r) continue;
    if (viewer.role === "talent" && r.talentId !== viewer.talentId) continue;
    if (viewer.role === "company" && card.companyId !== viewer.companyId) continue;
    const status = meetingStatus(m);
    if (status === "cancelled" && viewer.role === "company") continue;

    const ev = eventOf(db, card);
    let g = groups.get(ev.id);
    if (!g) {
      g = { event: ev, past: ev.date < today, eventDay: [], elsewhere: [], toArrange: [], cancelled: [] };
      groups.set(ev.id, g);
    }
    const mode = meetingMode(m);
    const timed = status === "booked" && !!m.slotStart;
    const row: MeetingRow = {
      meeting: m,
      mode,
      status,
      start: timed ? m.slotStart : undefined,
      end: timed ? meetingEnd(db, m) : undefined,
      table: mode === "event" && m.table ? m.table : undefined,
      cardId: card.id,
      cardTitle: card.title,
      responseId: r.id,
      publicCode: r.publicCode,
      counterpart:
        viewer.role === "talent"
          ? (db.companies.find((c) => c.id === card.companyId)?.name ?? "The company")
          : (db.talents.find((t) => t.id === r.talentId)?.displayName ?? "Someone"),
    };
    if (status === "cancelled") g.cancelled.push(row);
    else if (!timed) g.toArrange.push(row);
    else if (mode === "event") g.eventDay.push(row);
    else g.elsewhere.push(row);
  }

  for (const g of groups.values()) {
    g.eventDay.sort(byStart);
    g.elsewhere.sort(byStart);
    if (viewer.role === "talent") {
      if (g.eventDay.length) g.arrival = buildSchedule(db, g.event.id).arrivals[viewer.talentId];
    } else {
      g.table = tableOf(db, g.event.id, viewer.companyId);
    }
  }

  const order = sortedEvents(db).map((e) => e.id);
  const all = [...groups.values()].sort((a, b) => order.indexOf(a.event.id) - order.indexOf(b.event.id));
  return [...all.filter((g) => !g.past), ...all.filter((g) => g.past).reverse()];
}

/** How many meetings in a group still need something (a time to pick, or a new time). */
export function needsAction(g: EventMeetings): number {
  return g.toArrange.filter((r) => r.status === "pending" || r.status === "reschedule").length;
}
