import { describe, expect, it } from "vitest";
import { feedFor, logActivity, unseenCount, viewActivity } from "./activity";
import type { Account, DB } from "./types";

function makeDb(): DB {
  return {
    accounts: [],
    companies: [
      { id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" },
      { id: "co2", name: "Other Co", sector: "Games", size: "10", about: "" },
    ],
    cards: [
      { id: "c1", companyId: "co1", title: "Battery data", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z" },
    ],
    talents: [
      { id: "t1", displayName: "Olena Kovalenko", email: "o@example.com" },
      { id: "t2", displayName: "Mika Salonen", email: "m@example.com" },
    ],
    responses: [
      { id: "r1", publicCode: "A3", cardId: "c1", talentId: "t1", text: "x", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T09:00:00Z" },
      { id: "r2", publicCode: "B4", cardId: "c1", talentId: "t2", text: "y", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T10:00:00Z" },
    ],
    shortlists: [{ id: "s1", cardId: "c1", responseId: "r1", status: "invited" }],
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

function seedLog(db: DB) {
  const base = { cardId: "c1", companyId: "co1" };
  logActivity(db, { ...base, kind: "card_published", actor: "company", at: "2026-11-01T09:00:00Z" });
  logActivity(db, { ...base, kind: "answer_sent", actor: "talent", responseId: "r1", talentId: "t1", at: "2026-11-02T09:00:00Z" });
  logActivity(db, { ...base, kind: "answer_sent", actor: "talent", responseId: "r2", talentId: "t2", at: "2026-11-02T10:00:00Z" });
  logActivity(db, { ...base, kind: "shortlisted", actor: "company", responseId: "r1", talentId: "t1", at: "2026-11-03T09:00:00Z" });
  logActivity(db, { ...base, kind: "shortlisted", actor: "company", responseId: "r2", talentId: "t2", at: "2026-11-03T09:05:00Z" });
  logActivity(db, { ...base, kind: "shortlist_removed", actor: "company", responseId: "r2", talentId: "t2", at: "2026-11-03T10:00:00Z" });
}

describe("activity visibility", () => {
  it("company feed has no talent name before acceptance, and has it after", () => {
    const db = makeDb();
    seedLog(db);
    logActivity(db, { cardId: "c1", companyId: "co1", kind: "invite_accepted", actor: "talent", responseId: "r1", talentId: "t1" });
    let all = feedFor(db, company).map((v) => v.text).join("\n");
    expect(all).not.toContain("Olena");
    expect(all).not.toContain("Mika");
    expect(all).toContain("#A3");

    db.shortlists[0].status = "accepted";
    all = feedFor(db, company).map((v) => v.text).join("\n");
    expect(all).toContain("Olena Kovalenko");
    expect(all).not.toContain("Mika");
  });

  it("talent never sees shortlist_removed, even for their own answer", () => {
    const db = makeDb();
    seedLog(db);
    const kinds = feedFor(db, mika).map((v) => v.kind);
    expect(kinds).toContain("shortlisted");
    expect(kinds).not.toContain("shortlist_removed");
    expect(feedFor(db, mika).every((v) => v.text.length > 0)).toBe(true);
  });

  it("a talent cannot see another talent's events", () => {
    const db = makeDb();
    seedLog(db);
    const feed = feedFor(db, olena);
    expect(feed).toHaveLength(2); // answer sent + shortlisted, only r1
    expect(feed.every((v) => v.href === "/talent/answers/r1")).toBe(true);
    const r2Row = db.activity.find((a) => a.responseId === "r2")!;
    expect(viewActivity(db, olena, r2Row)).toBeNull();
  });

  it("organiser feed is empty and other companies see nothing", () => {
    const db = makeDb();
    seedLog(db);
    expect(feedFor(db, organiser)).toEqual([]);
    expect(feedFor(db, { ...company, companyId: "co2" })).toEqual([]);
  });

  it("orders newest first, filters by response, counts unseen", () => {
    const db = makeDb();
    seedLog(db);
    const feed = feedFor(db, company);
    expect(feed[0].at >= feed[feed.length - 1].at).toBe(true);
    expect(feedFor(db, company, { responseId: "r1" }).length).toBe(2);
    expect(feedFor(db, company, { limit: 2 })).toHaveLength(2);
    // not-byMe company items: two answer_sent
    expect(unseenCount(db, company)).toBe(2);
    expect(unseenCount(db, { ...company, notificationsSeenAt: "2026-11-02T09:30:00Z" })).toBe(1);
  });
});
