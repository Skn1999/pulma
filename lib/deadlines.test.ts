import { describe, expect, it } from "vitest";
import { companyRecord, goalOf, goalProgress, inviteStatus, replyStatus } from "./deadlines";
import { nextSteps } from "./next-steps";
import { slotOptions } from "./slots";
import { sweepDeadlines } from "./sweep";
import { buildSchedule } from "./schedule";
import type { Account, DB } from "./types";

const NOW = Date.parse("2026-11-14T10:00:00Z"); // Fri 14 Nov, 12:00 in Helsinki

function makeDb(): DB {
  return {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "", office: "Hall C" }],
    cards: [{
      id: "c1", companyId: "co1", title: "Battery data", context: "", weekOneReality: "", hardPart: "", niceToHave: [],
      languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z",
      goal: { decideBy: "2026-12-12", replyWithinDays: 5, inviteDays: 3, meetModes: ["office", "video"] },
    }],
    talents: [
      { id: "t1", displayName: "Olena Kovalenko", email: "olena@example.com" },
      { id: "t2", displayName: "Mika Salonen", email: "mika@example.com" },
    ],
    responses: [
      { id: "r1", publicCode: "A3", cardId: "c1", talentId: "t1", text: "x", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-12T09:00:00Z" }, // due 17 Nov
      { id: "r2", publicCode: "B4", cardId: "c1", talentId: "t2", text: "y", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-05T09:00:00Z" }, // due 10 Nov: overdue
    ],
    shortlists: [],
    meetings: [],
    event: { id: "e", name: "E", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6 },
    feedback: [],
    closures: [],
    activity: [],
    availability: [],
  };
}
const company: Account = { id: "a1", email: "c@x", role: "company", displayName: "Boss", companyId: "co1", createdAt: "" };
const olena: Account = { id: "a2", email: "o@x", role: "talent", displayName: "Olena", talentId: "t1", createdAt: "" };

describe("goals and deadlines", () => {
  it("fills defaults for cards without a goal", () => {
    const db = makeDb();
    delete db.cards[0].goal;
    expect(goalOf(db.cards[0], db)).toEqual({ decideBy: "2026-12-05", replyWithinDays: 5, inviteDays: 3, meetModes: ["event"] });
  });

  it("tracks the reply promise per answer", () => {
    const db = makeDb();
    expect(replyStatus(db, db.responses[0], NOW)).toMatchObject({ state: "due", daysLeft: 3 });
    expect(replyStatus(db, db.responses[1], NOW)).toMatchObject({ state: "overdue", daysOver: 4 });
    db.closures.push({ id: "cl", cardId: "c1", responseId: "r2", createdAt: "2026-11-13T09:00:00Z" });
    expect(replyStatus(db, db.responses[1], NOW)).toMatchObject({ state: "replied", onTime: false });
  });

  it("counts pausing the problem as a reply to everyone who answered before", () => {
    const db = makeDb();
    Object.assign(db.cards[0], { state: "paused", stateReason: "Budget is on hold", stateAt: "2026-11-13T09:00:00Z" });
    expect(replyStatus(db, db.responses[0], NOW).state).toBe("replied");
  });

  it("expires an invite after its window, and a re-invite extends it", () => {
    const db = makeDb();
    db.shortlists.push({ id: "s1", cardId: "c1", responseId: "r1", status: "invited", createdAt: "2026-11-10T09:00:00Z" });
    expect(inviteStatus(db, db.shortlists[0], NOW).expired).toBe(true);
    db.shortlists[0].respondBy = "2026-11-16T09:00:00Z";
    expect(inviteStatus(db, db.shortlists[0], NOW)).toMatchObject({ expired: false, daysLeft: 2 });
  });

  it("shows no company record until enough answers count", () => {
    const db = makeDb();
    expect(companyRecord(db, "co1", NOW).rate).toBeNull();
    expect(goalProgress(db, db.cards[0], NOW)).toMatchObject({ answers: 2, awaitingReply: 2, overdue: 1 });
  });

  it("logs passed deadlines once", () => {
    const db = makeDb();
    expect(sweepDeadlines(db, NOW)).toBe(1);
    expect(sweepDeadlines(db, NOW)).toBe(0);
    expect(db.activity[0]).toMatchObject({ kind: "reply_overdue", actor: "system", responseId: "r2" });
  });
});

describe("next steps", () => {
  it("never names a talent to the company before they accept", () => {
    const db = makeDb();
    db.shortlists.push({ id: "s1", cardId: "c1", responseId: "r1", status: "invited", createdAt: "2026-11-13T09:00:00Z" });
    const steps = nextSteps(db, company, NOW);
    const json = JSON.stringify(steps);
    expect(json).not.toContain("Olena");
    expect(json).toContain("#A3");
    expect(steps.waitingOnYou[0]).toMatchObject({ overdue: true }); // the overdue reply comes first
  });

  it("tells the talent when the company is past its reply date", () => {
    const db = makeDb();
    db.responses[1].talentId = "t1";
    const them = nextSteps(db, olena, NOW).waitingOnThem;
    expect(them[0].text).toContain("past its reply date");
    expect(them[0].overdue).toBe(true);
  });
});

describe("meeting slots", () => {
  it("offers free 30-minute slots and skips busy ones", () => {
    const db = makeDb();
    db.availability.push({ id: "w1", companyId: "co1", mode: "office", start: "2026-11-17T13:00:00", end: "2026-11-17T14:00:00" });
    db.meetings.push(
      { id: "m1", cardId: "c1", responseId: "r1", slotStart: "", table: 0, status: "pending" },
      { id: "m2", cardId: "c1", responseId: "r2", slotStart: "2026-11-17T13:00:00", table: 0, mode: "office", status: "booked", durationMin: 30 },
    );
    const opts = slotOptions(db, "m1", NOW);
    expect(opts).toEqual([{ mode: "office", start: "2026-11-17T13:30:00", end: "2026-11-17T14:00:00", place: "Hall C" }]);
  });

  it("keeps office and pending meetings off the event-day schedule", () => {
    const db = makeDb();
    db.meetings.push(
      { id: "m1", cardId: "c1", responseId: "r1", slotStart: "", table: 0, status: "pending" },
      { id: "m2", cardId: "c1", responseId: "r2", slotStart: "2026-11-17T13:00:00", table: 0, mode: "office", status: "booked" },
    );
    expect(buildSchedule(db).slots).toHaveLength(0);
  });
});
