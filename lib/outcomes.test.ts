import { describe, expect, it } from "vitest";
import { seed } from "@/data/seed";
import { closeFollowUp, eventOutcomes, exampleAnswer, followUpEnd, followUpState, reportCsv, sweepFollowUps } from "./outcomes";
import type { DB } from "./types";

describe("example answer shown to companies", () => {
  it("is anonymous: no names or emails", () => {
    const db = structuredClone(seed) as DB;
    const ex = exampleAnswer(db);
    expect(ex?.text.length).toBeGreaterThan(0);
    const json = JSON.stringify(ex);
    for (const t of db.talents) {
      expect(json).not.toContain(t.displayName);
      expect(json).not.toContain(t.email);
    }
  });
});

// ---- After the event ----
const NOW = Date.parse("2026-11-14T10:00:00Z"); // Sat 14 Nov 2026 in Helsinki

function fixture(count: number): DB {
  const db: DB = {
    accounts: [], companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" }],
    cards: [], talents: [], responses: [], shortlists: [], meetings: [],
    events: [
      { id: "e1", name: "Past Day", date: "2026-11-01", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)", stage: "done", problemDeadline: "2026-10-20" },
      { id: "e2", name: "Other Day", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)", stage: "open", problemDeadline: "2026-11-21" },
    ],
    feedback: [], closures: [], activity: [], availability: [], participations: [],
  };
  const goal = { decideBy: "2026-12-12", replyWithinDays: 5, inviteDays: 3, meetModes: ["event" as const] };
  const mk = (id: string, eventId: string, title: string) =>
    db.cards.push({ id, companyId: "co1", title, context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-10-01T09:00:00Z", goal, eventId });
  mk("c1", "e1", "Battery data");
  mk("c2", "e1", "Cross-dock gates");
  mk("c3", "e2", "Other event problem");
  for (let i = 1; i <= count; i++) {
    const card = i === 1 ? "c2" : "c1";
    db.talents.push({ id: `t${i}`, displayName: `Person Number${i}`, email: `p${i}@example.com` });
    db.responses.push({ id: `r${i}`, publicCode: `A${i}`, cardId: card, talentId: `t${i}`, text: `secret answer ${i}`, originalLanguage: "English", aiAssisted: false, createdAt: "2026-10-02T09:00:00Z" });
    db.shortlists.push({ id: `s${i}`, cardId: card, responseId: `r${i}`, status: "accepted", createdAt: "2026-10-03T09:00:00Z" });
    db.meetings.push({ id: `m${i}`, cardId: card, responseId: `r${i}`, slotStart: "2026-11-01T10:00:00", table: 1, mode: "event", status: "booked" });
    db.feedback.push({ id: `fc${i}`, meetingId: `m${i}`, side: "company", outcome: "next-step" }, { id: `ft${i}`, meetingId: `m${i}`, side: "talent", outcome: "next-step" });
    db.activity.push({ id: `a${i}`, at: "2026-10-02T09:00:00Z", kind: "answer_sent", actor: "talent", cardId: card, companyId: "co1", responseId: `r${i}`, talentId: `t${i}` });
  }
  // Another event's personal data must survive a close.
  db.talents.push({ id: "tx", displayName: "Other Person", email: "other@example.com" });
  db.responses.push({ id: "rx", publicCode: "Z1", cardId: "c3", talentId: "tx", text: "other answer", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-10T09:00:00Z" });
  db.shortlists.push({ id: "sx", cardId: "c3", responseId: "rx", status: "invited", createdAt: "2026-11-11T09:00:00Z" });
  db.activity.push({ id: "ax", at: "2026-11-10T09:00:00Z", kind: "answer_sent", actor: "talent", cardId: "c3", companyId: "co1", responseId: "rx", talentId: "tx" });
  db.activity.push({ id: "ae", at: "2026-10-10T09:00:00Z", kind: "card_published", actor: "company", cardId: "c1", companyId: "co1" });
  return db;
}

describe("eventOutcomes", () => {
  it("counts the funnel for that event only", () => {
    const db = fixture(3);
    db.meetings[0].nextStep = { kind: "interview", by: "2026-11-10", plannedAt: "2026-11-02T09:00:00Z" };
    db.meetings[0].outcome = { kind: "hired", at: "2026-11-05T09:00:00Z" };
    db.meetings[1].nextStep = { kind: "trial", by: "2026-11-30", plannedAt: "2026-11-02T09:00:00Z" };
    db.meetings[1].outcome = { kind: "still_talking", at: "2026-11-05T09:00:00Z" };
    db.meetings[2].outcome = { kind: "talent_withdrew", at: "2026-11-06T09:00:00Z" };
    const r = eventOutcomes(db, "e1", NOW);
    expect(r.funnel).toMatchObject({ problems: 2, answers: 3, shortlisted: 3, accepted: 3, meetingsHeld: 3, nextStepAgreed: 3, hired: 1, stillTalking: 1, notThisTime: 0, talentWithdrew: 1 });
    expect(r.funnel.nextStepPlanned).toEqual({ interview: 1, trial: 1, offer: 0, other: 0 });
    expect(eventOutcomes(db, "e2", NOW).funnel).toMatchObject({ problems: 1, answers: 1, meetingsHeld: 0 });
  });

  it("lists problems with no next step", () => {
    const db = fixture(3);
    db.meetings[0].nextStep = { kind: "offer", by: "2026-11-10", plannedAt: "2026-11-02T09:00:00Z" }; // m1 is on c2
    const r = eventOutcomes(db, "e1", NOW);
    expect(r.problemsWithoutNextStep).toEqual([{ cardId: "c1", title: "Battery data", companyName: "Kiertovolt" }]);
  });

  it("suppresses medians and kept % under 5", () => {
    const small = eventOutcomes(fixture(4), "e1", NOW).promises;
    expect(small.medianReplyDays).toBeNull();
    expect(small.replyKeptPct).toBeNull();
    expect(small.nextStepKeptPct).toBeNull();
    const big = eventOutcomes(fixture(6), "e1", NOW).promises;
    expect(big.medianReplyDays).toBe(1); // each answer was replied to a day later
    expect(big.replyKeptPct).toBe(100);
  });
});

describe("followUpState", () => {
  const ev = fixture(1).events[0]; // 2026-11-01, 60 days
  it("moves before → settling → final", () => {
    expect(followUpState(ev, Date.parse("2026-10-31T12:00:00Z"))).toBe("before");
    expect(followUpState(ev, NOW)).toBe("settling");
    expect(followUpEnd(ev)).toBe("2026-12-31");
    expect(followUpState({ ...ev, report: eventOutcomes(fixture(1), "e1", NOW), closedAt: "x" }, NOW)).toBe("final");
  });
});

describe("closeFollowUp", () => {
  it("deletes exactly that event's personal data and keeps the snapshot", () => {
    const db = fixture(3);
    db.closures.push({ id: "cl1", cardId: "c1", responseId: "r2", createdAt: "2026-10-04T09:00:00Z" }, { id: "clx", cardId: "c3", responseId: "rx", createdAt: "2026-11-12T09:00:00Z" });
    expect(closeFollowUp(db, "e1", NOW)).toBe(true);
    expect(db.responses.map((r) => r.id)).toEqual(["rx"]);
    expect(db.shortlists.map((s) => s.id)).toEqual(["sx"]);
    expect(db.meetings).toEqual([]);
    expect(db.feedback).toEqual([]);
    expect(db.closures.map((c) => c.id)).toEqual(["clx"]);
    expect(db.activity.map((a) => a.id).sort()).toEqual(["ae", "ax"]);
    expect(db.cards).toHaveLength(3);
    expect(db.talents).toHaveLength(4);
    const ev = db.events[0];
    expect(ev.report?.funnel).toMatchObject({ answers: 3, meetingsHeld: 3 });
    expect(ev.closedAt).toBe(new Date(NOW).toISOString());
    expect(followUpState(ev, NOW)).toBe("final");
    expect(closeFollowUp(db, "e1", NOW)).toBe(false);
  });

  it("closes only windows that have ended", () => {
    const db = fixture(1);
    expect(sweepFollowUps(db, NOW)).toBe(0);
    expect(sweepFollowUps(db, Date.parse("2027-01-02T10:00:00Z"))).toBe(1);
    expect(db.events[0].report).toBeDefined();
    expect(db.events[1].report).toBeUndefined();
  });
});

describe("report and CSV privacy", () => {
  it("never contain a talent's name, email, code or answer text", () => {
    const db = fixture(6);
    const ev = db.events[0];
    const report = eventOutcomes(db, "e1", NOW);
    const text = JSON.stringify(report) + reportCsv(ev, report);
    for (const t of db.talents) {
      expect(text).not.toContain(t.displayName);
      expect(text).not.toContain(t.email);
    }
    for (const r of db.responses) {
      expect(text).not.toContain(r.text);
      expect(text).not.toContain(`"${r.publicCode}"`);
    }
    expect(reportCsv(ev, report).startsWith("metric,value\n")).toBe(true);
  });
});

describe("seed", () => {
  it("has a settling ev-0 and a closed ev-old with only a snapshot", () => {
    const db = structuredClone(seed) as DB;
    const t = Date.parse("2026-11-15T10:00:00Z");
    expect(followUpState(db.events.find((e) => e.id === "ev-0")!, t)).toBe("settling");
    const old = db.events.find((e) => e.id === "ev-old")!;
    expect(followUpState(old, t)).toBe("final");
    expect(old.closedAt).toBeDefined();
    expect(db.cards.some((c) => c.eventId === "ev-old")).toBe(false);
  });
});
