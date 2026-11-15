import { describe, expect, it } from "vitest";
import { companyRecord, MIN_RECORD } from "./deadlines";
import { isMutual, nextStepStatus, nextStepWindow, validBy } from "./follow-up";
import { nextSteps } from "./next-steps";
import { sweepDeadlines } from "./sweep";
import { buildThread } from "./thread";
import type { Account, DB, Meeting } from "./types";

const NOW = Date.parse("2026-11-14T10:00:00Z"); // Sat 14 Nov 2026, 12:00 in Helsinki
const TODAY = "2026-11-14";

function makeDb(count = 1): DB {
  const db: DB = {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" }],
    cards: [{
      id: "c1", companyId: "co1", title: "Battery data", context: "", weekOneReality: "", hardPart: "", niceToHave: [],
      languages: ["English"], format: "onsite", status: "published", createdAt: "2026-10-01T09:00:00Z",
      goal: { decideBy: "2026-12-12", replyWithinDays: 5, inviteDays: 3, meetModes: ["event"] },
    }],
    talents: [],
    responses: [],
    shortlists: [],
    meetings: [],
    events: [{ id: "e", name: "E", date: "2026-11-01", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)", stage: "done" as const, problemDeadline: "2026-10-20" }],
    feedback: [],
    closures: [],
    activity: [],
    availability: [],
    participations: [],
  };
  for (let i = 1; i <= count; i++) {
    db.talents.push({ id: `t${i}`, displayName: `Person Number${i}`, email: `p${i}@example.com` });
    db.responses.push({ id: `r${i}`, publicCode: `A${i}`, cardId: "c1", talentId: `t${i}`, text: "x", originalLanguage: "English", aiAssisted: false, createdAt: "2026-10-02T09:00:00Z" });
    db.shortlists.push({ id: `s${i}`, cardId: "c1", responseId: `r${i}`, status: "accepted", createdAt: "2026-10-02T12:00:00Z" });
    db.meetings.push({ id: `m${i}`, cardId: "c1", responseId: `r${i}`, slotStart: "2026-11-01T10:00:00", table: 1, mode: "event", status: "booked" });
    db.feedback.push({ id: `fc${i}`, meetingId: `m${i}`, side: "company", outcome: "next-step" }, { id: `ft${i}`, meetingId: `m${i}`, side: "talent", outcome: "next-step" });
  }
  return db;
}

const plan = (by: string, extra: Partial<NonNullable<Meeting["nextStep"]>> = {}) => ({ kind: "interview" as const, by, plannedAt: "2026-11-02T09:00:00.000Z", ...extra });
const company: Account = { id: "a1", email: "c@x", role: "company", displayName: "Boss", companyId: "co1", createdAt: "" };

describe("eligibility", () => {
  it("is mutual only when both sides chose next-step", () => {
    const db = makeDb();
    expect(isMutual(db, "m1")).toBe(true);
    db.feedback.find((f) => f.id === "ft1")!.outcome = "not-now";
    expect(isMutual(db, "m1")).toBe(false);
    db.feedback.find((f) => f.id === "ft1")!.outcome = "next-step";
    db.feedback = db.feedback.filter((f) => f.id !== "fc1");
    expect(isMutual(db, "m1")).toBe(false);
  });

  it("offers dates from tomorrow to 30 days ahead", () => {
    expect(nextStepWindow(NOW)).toEqual({ min: "2026-11-15", max: "2026-12-14" });
    expect(validBy("2026-11-15", NOW)).toBe(true);
    expect(validBy("2026-12-14", NOW)).toBe(true);
    expect(validBy(TODAY, NOW)).toBe(false);
    expect(validBy("2026-12-15", NOW)).toBe(false);
    expect(validBy("2026-02-31", NOW)).toBe(false);
    expect(validBy("soon", NOW)).toBe(false);
  });
});

describe("nextStepStatus", () => {
  const m = (over: Partial<Meeting>): Meeting => ({ id: "m", cardId: "c", responseId: "r", slotStart: "", table: 0, ...over });
  it("none, planned, overdue, done, still_talking", () => {
    expect(nextStepStatus(m({}), NOW).state).toBe("none");
    expect(nextStepStatus(m({ nextStep: plan("2026-11-20") }), NOW)).toMatchObject({ state: "planned", daysLeft: 6 });
    expect(nextStepStatus(m({ nextStep: plan(TODAY) }), NOW)).toMatchObject({ state: "planned", daysLeft: 0 }); // today is not late yet
    expect(nextStepStatus(m({ nextStep: plan("2026-11-12") }), NOW)).toMatchObject({ state: "overdue", daysOver: 2 });
    expect(nextStepStatus(m({ nextStep: plan("2026-11-12"), outcome: { kind: "hired", at: "2026-11-11T10:00:00Z" } }), NOW).state).toBe("done");
    expect(nextStepStatus(m({ nextStep: plan("2026-11-12"), outcome: { kind: "not_this_time", at: "x", reason: "Our needs changed" } }), NOW).state).toBe("done");
    expect(nextStepStatus(m({ outcome: { kind: "talent_withdrew", at: "x" } }), NOW).state).toBe("done");
    expect(nextStepStatus(m({ nextStep: plan("2026-11-25"), outcome: { kind: "still_talking", at: "x" } }), NOW)).toMatchObject({ state: "still_talking", daysLeft: 11 });
    // still talking only until the new date: then it is overdue again
    expect(nextStepStatus(m({ nextStep: plan("2026-11-10"), outcome: { kind: "still_talking", at: "x" } }), NOW).state).toBe("overdue");
  });
});

describe("sweep", () => {
  it("logs next_step_overdue once per plan, to both sides, as the system", () => {
    const db = makeDb();
    db.meetings[0].nextStep = plan("2026-11-10");
    expect(sweepDeadlines(db, NOW)).toBe(1);
    expect(sweepDeadlines(db, NOW + 3600_000)).toBe(0);
    const rows = db.activity.filter((a) => a.kind === "next_step_overdue");
    expect(rows).toHaveLength(1);
    expect(rows[0].actor).toBe("system");
    // a re-plan that goes overdue again is a new promise: it logs again
    db.meetings[0].nextStep = plan("2026-11-12", { updatedAt: new Date(NOW + 2 * 3600_000).toISOString() });
    expect(sweepDeadlines(db, NOW + 3 * 24 * 3600_000)).toBe(1);
    expect(db.activity.filter((a) => a.kind === "next_step_overdue")).toHaveLength(2);
  });

  it("does nothing for plans that are not late, are closed, or are not mutual", () => {
    const db = makeDb(3);
    db.meetings[0].nextStep = plan("2026-11-20");
    db.meetings[1].nextStep = plan("2026-11-10");
    db.meetings[1].outcome = { kind: "hired", at: "2026-11-09T10:00:00Z" };
    db.meetings[2].nextStep = plan("2026-11-10");
    db.feedback.find((f) => f.id === "ft3")!.outcome = "not-now";
    expect(sweepDeadlines(db, NOW)).toBe(0);
  });

  it("tells each side in their own words, naming no one the viewer may not know", () => {
    const db = makeDb();
    db.meetings[0].nextStep = plan("2026-11-10");
    sweepDeadlines(db, NOW);
    const talent: Account = { id: "a2", email: "t@x", role: "talent", displayName: "P", talentId: "t1", createdAt: "" };
    const th = buildThread(db, talent, "r1", NOW)!;
    expect(th.events.map((e) => e.text).join(" ")).toContain("Kiertovolt is past its next-step date");
    expect(buildThread(db, company, "r1", NOW)!.events.map((e) => e.text).join(" ")).toContain("Person Number1 has passed");
  });
});

describe("company record counts next-step promises", () => {
  it("kept, late and overdue-now; MIN_RECORD still applies", () => {
    const db = makeDb(4);
    // no reply history in this db: only next steps are counted
    db.responses.forEach((r) => (r.createdAt = "2026-11-13T09:00:00Z"));
    db.shortlists.forEach((s) => (s.createdAt = "2026-11-13T12:00:00Z"));
    db.meetings[0].nextStep = plan("2026-11-10");
    db.meetings[0].outcome = { kind: "hired", at: "2026-11-09T10:00:00Z" }; // kept
    db.meetings[1].nextStep = plan("2026-11-10", { missed: true });
    db.meetings[1].outcome = { kind: "not_this_time", at: "2026-11-11T10:00:00Z", reason: "Our needs changed" }; // late
    db.meetings[2].nextStep = plan("2026-11-08"); // overdue now
    db.meetings[3].nextStep = plan("2026-11-20"); // planned, not yet counted
    const rec = companyRecord(db, "co1", NOW);
    expect(rec).toMatchObject({ counted: 4 + 3, onTime: 4 + 1, late: 1, overdueNow: 1 });
    expect(rec.rate).toBeCloseTo(5 / 7);
    expect(MIN_RECORD).toBe(5);
    const few = makeDb(2);
    few.meetings[0].nextStep = plan("2026-11-10");
    few.meetings[0].outcome = { kind: "hired", at: "2026-11-09T10:00:00Z" };
    expect(companyRecord(few, "co1", NOW)).toMatchObject({ rate: null });
  });

  it("a talent who took another job does not count against the company", () => {
    const db = makeDb(1);
    db.meetings[0].nextStep = plan("2026-11-20");
    db.meetings[0].outcome = { kind: "talent_withdrew", at: "2026-11-12T10:00:00Z" };
    expect(companyRecord(db, "co1", NOW).counted).toBe(1); // only its on-time reply (see below)
  });
});

describe("next-steps lists", () => {
  it("company: plan it, then record it; overdue first", () => {
    const db = makeDb(2);
    db.meetings[1].nextStep = plan("2026-11-10");
    const you = nextSteps(db, company, NOW).waitingOnYou;
    expect(you.find((s) => s.id === "plan-m1")?.text).toBe("Plan the next step with Person Number1");
    const rec = you.find((s) => s.id === "outcome-m2");
    expect(rec).toMatchObject({ text: "Tell Person Number2 how it went by 10 Nov", overdue: true });
    expect(you.findIndex((s) => s.id === "outcome-m2")).toBeLessThan(you.findIndex((s) => s.id === "plan-m1"));
  });

  it("never names a talent before they accepted", () => {
    const db = makeDb(2);
    db.shortlists[0].status = "invited"; // not accepted: still just a code
    db.meetings[1].nextStep = plan("2026-11-20");
    db.shortlists[1].status = "invited";
    const text = nextSteps(db, company, NOW).waitingOnYou.map((s) => s.text).join("\n");
    expect(text).not.toContain("Person Number");
    const accepted = makeDb(1);
    expect(nextSteps(accepted, company, NOW).waitingOnYou.map((s) => s.text).join("\n")).toContain("Person Number1");
    // and a closed (hired) plan produces no item
    accepted.meetings[0].nextStep = plan("2026-11-20");
    accepted.meetings[0].outcome = { kind: "hired", at: "2026-11-12T10:00:00Z" };
    expect(nextSteps(accepted, company, NOW).waitingOnYou.some((s) => s.id.startsWith("plan-") || s.id.startsWith("outcome-"))).toBe(false);
  });

  it("talent: waiting on the company, overdue flagged, only their own", () => {
    const db = makeDb(2);
    db.meetings[0].nextStep = plan("2026-11-20", { kind: "trial" });
    db.meetings[1].nextStep = plan("2026-11-10");
    const talent: Account = { id: "a2", email: "t@x", role: "talent", displayName: "P", talentId: "t1", createdAt: "" };
    const them = nextSteps(db, talent, NOW).waitingOnThem.filter((s) => s.id.startsWith("nextstep-"));
    expect(them).toHaveLength(1);
    expect(them[0].text).toBe("Kiertovolt: trial day by 20 Nov");
    const t2: Account = { ...talent, id: "a3", talentId: "t2" };
    const late = nextSteps(db, t2, NOW).waitingOnThem.find((s) => s.id === "nextstep-m2");
    expect(late).toMatchObject({ overdue: true });
    expect(late?.text).toContain("past its date");
  });
});
