import { describe, expect, it } from "vitest";
import { canMoveStage, canPublishTo, candidateVisibleCards, eventStage, freeTable, seatsLeft } from "./participation";
import type { DB, Event, Participation, ProblemCard } from "./types";

const NOW = Date.parse("2026-11-14T10:00:00Z"); // 14 Nov, Helsinki

const ev = (over: Partial<Event> = {}): Event => ({
  id: "ev-1", name: "Tech Day", date: "2026-12-05", startTime: "10:00", endTime: "11:00", slotMinutes: 10, tables: 3,
  venue: "Hall (demo venue)", stage: "open", problemDeadline: "2026-11-21", ...over,
});
const card = (id: string, companyId: string, eventId = "ev-1"): ProblemCard => ({
  id, companyId, title: id, context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"],
  format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z", eventId,
});
const part = (companyId: string, status: Participation["status"], table?: number, eventId = "ev-1"): Participation => ({
  id: `p-${companyId}-${eventId}`, eventId, companyId, status, ...(table ? { table } : {}), invitedAt: "2026-11-01T09:00:00Z",
});

function makeDb(over: Partial<DB> = {}): DB {
  return {
    accounts: [], companies: [], cards: [], talents: [], responses: [], shortlists: [], meetings: [], events: [ev()],
    feedback: [], closures: [], activity: [], availability: [], participations: [part("co1", "confirmed", 1)], ...over,
  };
}

describe("canPublishTo", () => {
  it("is ok for a confirmed company on an open event before the deadline", () => {
    expect(canPublishTo(makeDb(), "co1", "ev-1", NOW)).toEqual({ ok: true });
  });
  it("refuses a company that has not accepted", () => {
    for (const status of ["invited", "declined", "withdrawn"] as const) {
      const r = canPublishTo(makeDb({ participations: [part("co1", status)] }), "co1", "ev-1", NOW);
      expect(r.ok).toBe(false);
    }
    expect(canPublishTo(makeDb({ participations: [] }), "co1", "ev-1", NOW).ok).toBe(false);
  });
  it("refuses an unknown event", () => {
    expect(canPublishTo(makeDb(), "co1", "nope", NOW).ok).toBe(false);
  });
  it("refuses draft, locked and done events", () => {
    for (const stage of ["draft", "locked", "done"] as const) {
      expect(canPublishTo(makeDb({ events: [ev({ stage })] }), "co1", "ev-1", NOW).ok).toBe(false);
    }
  });
  it("refuses once the event date has passed even if the stage says open", () => {
    expect(canPublishTo(makeDb(), "co1", "ev-1", Date.parse("2026-12-06T10:00:00Z")).ok).toBe(false);
  });
  it("allows the deadline day and refuses the day after", () => {
    expect(canPublishTo(makeDb(), "co1", "ev-1", Date.parse("2026-11-21T20:00:00Z")).ok).toBe(true);
    const late = canPublishTo(makeDb(), "co1", "ev-1", Date.parse("2026-11-22T10:00:00Z"));
    expect(late).toEqual({ ok: false, reason: "The problem deadline for this event has passed." });
  });
  it("allows a 3rd problem and refuses a 4th", () => {
    expect(canPublishTo(makeDb({ cards: [card("a", "co1"), card("b", "co1")] }), "co1", "ev-1", NOW).ok).toBe(true);
    expect(canPublishTo(makeDb({ cards: [card("a", "co1"), card("b", "co1"), card("c", "co1")] }), "co1", "ev-1", NOW).ok).toBe(false);
  });
  it("counts only this company's problems in this event", () => {
    const cards = [card("a", "co2"), card("b", "co2"), card("c", "co2"), card("d", "co1", "ev-2")];
    expect(canPublishTo(makeDb({ cards }), "co1", "ev-1", NOW).ok).toBe(true);
  });
});

describe("tables and seats", () => {
  it("freeTable is the lowest table not held by a confirmed company", () => {
    const db = makeDb({ participations: [part("co1", "confirmed", 1), part("co2", "confirmed", 3), part("co3", "invited")] });
    expect(freeTable(db, "ev-1")).toBe(2);
  });
  it("freeTable is undefined when every table is held", () => {
    const db = makeDb({ participations: [1, 2, 3].map((t) => part(`co${t}`, "confirmed", t)) });
    expect(freeTable(db, "ev-1")).toBeUndefined();
  });
  it("a withdrawn company frees its table", () => {
    const db = makeDb({ participations: [part("co1", "withdrawn"), part("co2", "confirmed", 2)] });
    expect(freeTable(db, "ev-1")).toBe(1);
  });
  it("seatsLeft counts confirmed and invited, not declined or withdrawn", () => {
    const db = makeDb({ participations: [part("co1", "confirmed", 1), part("co2", "invited"), part("co3", "declined"), part("co4", "withdrawn")] });
    expect(seatsLeft(db, "ev-1")).toBe(1);
  });
});

describe("stages", () => {
  it("an event whose date has passed reads as done", () => {
    expect(eventStage(ev(), NOW)).toBe("open");
    expect(eventStage(ev(), Date.parse("2026-12-06T10:00:00Z"))).toBe("done");
  });
  it("allowed moves", () => {
    const e = ev();
    expect(canMoveStage("draft", "open", e, NOW)).toBe(true);
    expect(canMoveStage("open", "locked", e, NOW)).toBe(true);
    expect(canMoveStage("locked", "open", e, NOW)).toBe(true);
    expect(canMoveStage("locked", "done", e, NOW)).toBe(true);
    expect(canMoveStage("open", "done", e, NOW)).toBe(false);
    expect(canMoveStage("open", "done", e, Date.parse("2026-12-06T10:00:00Z"))).toBe(true);
    expect(canMoveStage("draft", "locked", e, NOW)).toBe(false);
    expect(canMoveStage("done", "open", e, NOW)).toBe(false);
  });
  it("candidates see problems of open and locked events only", () => {
    const events = [ev({ id: "d", stage: "draft" }), ev({ id: "o" }), ev({ id: "l", stage: "locked" }), ev({ id: "x", stage: "done" })];
    const db = makeDb({ events, cards: events.map((e) => card(`c-${e.id}`, "co1", e.id)) });
    expect(candidateVisibleCards(db, NOW).map((c) => c.id)).toEqual(["c-o", "c-l"]);
  });
});
