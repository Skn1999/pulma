import { describe, expect, it } from "vitest";
import { buildThread } from "./thread";
import { logActivity } from "./activity";
import type { Account, DB } from "./types";

function makeDb(): DB {
  return {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" }],
    cards: [{ id: "c1", companyId: "co1", title: "Battery data", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z" }],
    talents: [
      { id: "t1", displayName: "Olena Kovalenko", email: "olena@example.com" },
      { id: "t2", displayName: "Mika Salonen", email: "mika@example.com" },
    ],
    responses: [{ id: "r1", publicCode: "A3", cardId: "c1", talentId: "t1", text: "x", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T09:00:00Z" }],
    shortlists: [{ id: "s1", cardId: "c1", responseId: "r1", status: "invited", message: "Loved your approach" }],
    meetings: [],
    events: [{ id: "e", name: "E", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)" }],
    feedback: [],
    closures: [],
    activity: [],
    availability: [],
  };
}
const company: Account = { id: "a1", email: "c@x", role: "company", displayName: "Boss", companyId: "co1", createdAt: "" };
const olena: Account = { id: "a2", email: "o@x", role: "talent", displayName: "Olena Kovalenko", talentId: "t1", createdAt: "" };
const mika: Account = { id: "a3", email: "m@x", role: "talent", displayName: "Mika Salonen", talentId: "t2", createdAt: "" };
const organiser: Account = { id: "a4", email: "e@x", role: "organiser", displayName: "Events", createdAt: "" };

describe("buildThread", () => {
  it("hides the talent identity from the company before acceptance", () => {
    const db = makeDb();
    logActivity(db, { kind: "answer_sent", actor: "talent", cardId: "c1", companyId: "co1", responseId: "r1", talentId: "t1" });
    logActivity(db, { kind: "shortlisted", actor: "company", cardId: "c1", companyId: "co1", responseId: "r1", talentId: "t1" });
    const t = buildThread(db, company, "r1")!;
    expect(t.stage).toBe("shortlisted");
    const json = JSON.stringify(t);
    expect(json).not.toContain("Olena");
    expect(json).not.toContain("olena@example.com");
    expect(t.counterpartName).toBeUndefined();
  });
  it("shows the name after acceptance", () => {
    const db = makeDb();
    db.shortlists[0].status = "accepted";
    logActivity(db, { kind: "invite_accepted", actor: "talent", cardId: "c1", companyId: "co1", responseId: "r1", talentId: "t1" });
    const t = buildThread(db, company, "r1")!;
    expect(t.counterpartName).toBe("Olena Kovalenko");
    expect(JSON.stringify(t)).toContain("Olena");
    expect(JSON.stringify(t)).not.toContain("olena@example.com");
    expect(buildThread(db, olena, "r1")!.counterpartName).toBe("Kiertovolt");
  });
  it("returns null for other talents, organisers and missing responses", () => {
    const db = makeDb();
    expect(buildThread(db, mika, "r1")).toBeNull();
    expect(buildThread(db, organiser, "r1")).toBeNull();
    expect(buildThread(db, olena, "nope")).toBeNull();
  });
  it("shows closed with reason", () => {
    const db = makeDb();
    db.shortlists = [];
    db.closures.push({ id: "x", cardId: "c1", responseId: "r1", reason: "The timing isn't right for us", createdAt: "2026-11-03T09:00:00Z" });
    const t = buildThread(db, olena, "r1")!;
    expect(t.stage).toBe("closed");
    expect(t.closedReason).toContain("timing");
  });
});
