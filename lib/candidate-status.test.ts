import { describe, expect, it } from "vitest";
import { candidateStatus } from "./candidate-status";
import type { DB } from "./types";

const NOW = Date.parse("2026-11-14T10:00:00Z");

function makeDb(): DB {
  return {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "", office: "Hall C" }],
    cards: [{
      id: "c1", companyId: "co1", title: "T", context: "", weekOneReality: "", hardPart: "", niceToHave: [],
      languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z",
      goal: { decideBy: "2026-12-12", replyWithinDays: 5, inviteDays: 3, meetModes: ["event"] },
    }],
    talents: [{ id: "t1", displayName: "Olena", email: "o@example.com" }],
    responses: [],
    shortlists: [], meetings: [],
    events: [{ id: "e", name: "E", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)", stage: "open" as const, problemDeadline: "2026-11-21" }],
    feedback: [], closures: [], activity: [], availability: [], participations: [],
  };
}
const answer = (db: DB, createdAt = "2026-11-13T09:00:00Z") =>
  db.responses.push({ id: "r1", publicCode: "A1", cardId: "c1", talentId: "t1", text: "x", originalLanguage: "English", aiAssisted: false, createdAt });
const kind = (db: DB) => candidateStatus(db, "t1", "c1", NOW).kind;

describe("candidateStatus", () => {
  it("is new with nothing, saved when saved and unanswered", () => {
    const db = makeDb();
    expect(kind(db)).toBe("new");
    db.talents[0].saved = ["c1"];
    expect(kind(db)).toBe("saved");
  });
  it("answered beats saved and shows the reply-by date", () => {
    const db = makeDb();
    db.talents[0].saved = ["c1"];
    answer(db);
    const s = candidateStatus(db, "t1", "c1", NOW);
    expect(s.kind).toBe("answered");
    expect(s.detail).toMatch(/^Reply expected by/);
  });
  it("flags an overdue reply", () => {
    const db = makeDb();
    answer(db, "2026-11-01T09:00:00Z");
    expect(candidateStatus(db, "t1", "c1", NOW).detail).toBe("Company reply late");
  });
  it("invited beats answered; an expired invite is closed", () => {
    const db = makeDb();
    answer(db);
    db.shortlists.push({ id: "s1", cardId: "c1", responseId: "r1", status: "invited", createdAt: "2026-11-13T09:00:00Z" });
    expect(kind(db)).toBe("invited");
    db.shortlists[0].createdAt = "2026-11-01T09:00:00Z";
    expect(kind(db)).toBe("closed");
  });
  it("accepted is a meeting; pending asks to pick a time", () => {
    const db = makeDb();
    answer(db);
    db.shortlists.push({ id: "s1", cardId: "c1", responseId: "r1", status: "accepted" });
    db.meetings.push({ id: "m1", cardId: "c1", responseId: "r1", slotStart: "", table: 0, status: "pending" });
    const s = candidateStatus(db, "t1", "c1", NOW);
    expect(s.kind).toBe("meeting");
    expect(s.detail).toBe("Pick a time");
  });
  it("stepped back beats closed and answered", () => {
    const db = makeDb();
    answer(db);
    db.responses[0].steppedBack = { at: "2026-11-13T10:00:00Z", until: "2027-01-12" };
    db.closures.push({ id: "k1", cardId: "c1", responseId: "r1", createdAt: "2026-11-13T11:00:00Z" });
    expect(candidateStatus(db, "t1", "c1", NOW).kind).toBe("stepped_back");
  });
  it("closure, declined invite or a paused card is closed, beating answered", () => {
    const db = makeDb();
    answer(db);
    db.closures.push({ id: "k1", cardId: "c1", responseId: "r1", createdAt: "2026-11-13T11:00:00Z" });
    expect(kind(db)).toBe("closed");
    const db2 = makeDb();
    answer(db2);
    db2.shortlists.push({ id: "s1", cardId: "c1", responseId: "r1", status: "declined" });
    expect(kind(db2)).toBe("closed");
    const db3 = makeDb();
    answer(db3);
    db3.cards[0].state = "paused";
    expect(kind(db3)).toBe("closed");
  });
  it("the saved list is not part of any company-facing payload", async () => {
    const { buildBlindResponses } = await import("./blind-responses");
    const db = makeDb();
    db.talents[0].saved = ["c1"];
    answer(db);
    expect(JSON.stringify(buildBlindResponses(db, db.cards[0], NOW))).not.toContain("saved");
  });
});
