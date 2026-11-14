import { describe, expect, it } from "vitest";
import { defaultEvent, eventLabel, eventOf, eventOfMeeting, tablePlace, upcomingEvents } from "./events";
import { buildSchedule } from "./schedule";
import { slotOptions } from "./slots";
import { parseEventInput } from "./event-input";
import type { DB, Event, Meeting, ProblemCard, Response } from "./types";

const ev1: Event = { id: "ev-1", name: "Tech Day", date: "2026-12-05", startTime: "10:00", endTime: "11:00", slotMinutes: 10, tables: 2, venue: "Hall A (demo venue)", stage: "open" as const, problemDeadline: "2026-11-21" };
const ev2: Event = { id: "ev-2", name: "Green Morning", date: "2026-12-10", startTime: "09:00", endTime: "10:00", slotMinutes: 10, tables: 2, venue: "Pavilion (demo venue)", stage: "open" as const, problemDeadline: "2026-11-21" };

const companies = [
  { id: "co1", name: "One", sector: "Clean-tech", size: "10", about: "" },
  { id: "co2", name: "Two", sector: "Medtech", size: "10", about: "" },
];

const card = (id: string, companyId: string, eventId?: string): ProblemCard => ({
  id, companyId, title: id, context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"],
  format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z", ...(eventId ? { eventId } : {}),
});
const response = (id: string, cardId: string, talentId: string): Response => ({
  id, publicCode: id.toUpperCase(), cardId, talentId, text: "", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T09:00:00Z",
});
const meeting = (id: string, cardId: string, responseId: string): Meeting => ({ id, cardId, responseId, slotStart: "", table: 0 });

function makeDb(over: Partial<DB> = {}): DB {
  return {
    accounts: [], companies, cards: [], talents: [], responses: [], shortlists: [], meetings: [], events: [ev2, ev1],
    feedback: [], closures: [], activity: [], availability: [], participations: [], ...over,
  };
}

describe("events helpers", () => {
  it("defaultEvent is the earliest by date", () => {
    expect(defaultEvent(makeDb()).id).toBe("ev-1");
  });

  it("eventOf uses eventId and falls back to the default", () => {
    const db = makeDb();
    expect(eventOf(db, card("a", "co1", "ev-2")).id).toBe("ev-2");
    expect(eventOf(db, card("b", "co1")).id).toBe("ev-1");
    expect(eventOf(db, card("c", "co1", "gone")).id).toBe("ev-1");
  });

  it("eventOfMeeting goes through the card", () => {
    const db = makeDb({ cards: [card("a", "co1", "ev-2")] });
    expect(eventOfMeeting(db, meeting("m", "a", "r")).id).toBe("ev-2");
  });

  it("upcomingEvents keeps today and later, sorted", () => {
    const db = makeDb();
    const noon = Date.parse("2026-12-05T10:00:00Z");
    expect(upcomingEvents(db, noon).map((e) => e.id)).toEqual(["ev-1", "ev-2"]);
    expect(upcomingEvents(db, Date.parse("2026-12-06T10:00:00Z")).map((e) => e.id)).toEqual(["ev-2"]);
  });

  it("labels events", () => {
    expect(eventLabel(ev1)).toBe("Tech Day · Sat 5 Dec · Hall A (demo venue)");
    expect(tablePlace(ev1, 2)).toBe("Table 2 at Tech Day, Sat 5 Dec, Hall A (demo venue)");
  });
});

describe("buildSchedule per event", () => {
  it("gives the same company a table in each event without clashing", () => {
    const db = makeDb({
      cards: [card("a1", "co1", "ev-1"), card("a2", "co1", "ev-2"), card("b1", "co2", "ev-2")],
      responses: [response("r1", "a1", "t1"), response("r2", "a2", "t1"), response("r3", "b1", "t2")],
      meetings: [meeting("m1", "a1", "r1"), meeting("m2", "a2", "r2"), meeting("m3", "b1", "r3")],
    });
    const s1 = buildSchedule(db, "ev-1");
    const s2 = buildSchedule(db, "ev-2");
    expect(s1.slots.map((s) => s.meetingId)).toEqual(["m1"]);
    expect(s1.slots[0]).toMatchObject({ eventId: "ev-1", table: 1, start: "2026-12-05T10:00:00" });
    expect(s2.slots.map((s) => s.meetingId).sort()).toEqual(["m2", "m3"]);
    // Companies with a problem in ev-2: co1 -> table 1, co2 -> table 2.
    expect(s2.slots.find((s) => s.meetingId === "m3")).toMatchObject({ table: 2, start: "2026-12-10T09:00:00" });
    // The same talent is in both events on different days: no clash.
    expect(s1.arrivals.t1).toBe("2026-12-05T09:45:00");
    expect(s2.arrivals.t1).toBe("2026-12-10T08:45:00");
  });
});

describe("slotOptions uses the card's event", () => {
  const db = makeDb({
    cards: [{ ...card("a", "co1", "ev-2"), goal: { decideBy: "2026-12-10", replyWithinDays: 5, inviteDays: 3, meetModes: ["event"] } }],
    responses: [response("r1", "a", "t1")],
    meetings: [{ id: "m1", cardId: "a", responseId: "r1", slotStart: "", table: 0, status: "pending" }],
  });
  it("offers the event day while that event is ahead", () => {
    expect(slotOptions(db, "m1", Date.parse("2026-12-07T10:00:00Z"))).toEqual([{ mode: "event" }]);
  });
  it("stops offering it once that event is over, even if another is ahead", () => {
    expect(slotOptions(db, "m1", Date.parse("2026-12-11T10:00:00Z"))).toEqual([]);
  });
});

describe("parseEventInput", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  const ok = { name: "Spring Fair", date: "2026-12-20", startTime: "10:00", endTime: "13:00", tables: 5, venue: "Hall (demo venue)" };
  it("accepts a valid event", () => {
    expect(parseEventInput(ok, now)).toMatchObject({ ok: true });
  });
  it("rejects bad input", () => {
    for (const bad of [
      { ...ok, name: "ab" }, { ...ok, date: "2026-11-13" }, { ...ok, startTime: "10:05" },
      { ...ok, startTime: "14:00" }, { ...ok, tables: 0 }, { ...ok, tables: 31 }, { ...ok, venue: "" },
    ]) expect(parseEventInput(bad, now)).toMatchObject({ ok: false });
  });
});
