import { describe, expect, it } from "vitest";
import { cardViewerSide, eventCardFor, meetCode, parseCardSkills } from "./meet-card";
import type { Account, DB, Meeting } from "./types";

describe("meetCode", () => {
  it("is stable and 6 characters from the allowed alphabet", () => {
    for (let i = 1; i <= 50; i++) {
      const c = meetCode({ id: `mt-${i}` });
      expect(c).toBe(meetCode({ id: `mt-${i}` }));
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
  it("differs between meetings", () => {
    const codes = new Set(Array.from({ length: 50 }, (_, i) => meetCode({ id: `mt-${i + 1}` })));
    expect(codes.size).toBe(50);
  });
});

const ev = { id: "ev-1", name: "Tech Day", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 2, venue: "Hall A (demo venue)" };
const base: Meeting = { id: "mt-1", cardId: "c1", responseId: "r1", slotStart: "2026-12-05T10:20:00", table: 2 };
const T = (iso: string) => Date.parse(iso);

function db(m: Partial<Meeting> = {}, over: Partial<DB> = {}): DB {
  return {
    accounts: [{ id: "a-co", email: "x@example.com", role: "company", displayName: "Pekka Virtanen", companyId: "co1", createdAt: "" }],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "10", about: "" }],
    cards: [{ id: "c1", companyId: "co1", title: "Messy data", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: [], format: "onsite", status: "published", createdAt: "", eventId: "ev-1" }],
    talents: [{ id: "t1", displayName: "Olena Kovalenko", email: "o@example.com", skills: [{ label: "Python", source: "self", addedAt: "" }, { label: "SQL", source: "self", addedAt: "" }] }],
    responses: [{ id: "r1", publicCode: "A1", cardId: "c1", talentId: "t1", text: "", originalLanguage: "English", aiAssisted: false, createdAt: "" }],
    shortlists: [{ id: "s1", cardId: "c1", responseId: "r1", status: "accepted" }],
    meetings: [{ ...base, ...m }], events: [ev], feedback: [], closures: [], activity: [], availability: [], ...over,
  };
}

describe("eventCardFor", () => {
  const before = T("2026-12-01T10:00:00Z");
  it("returns first names only, the code and chosen skills for a booked event-day meeting", () => {
    const c = eventCardFor(db({ cardSkills: ["Python", "Not mine"] }), "mt-1", before)!;
    expect(c.talentFirstName).toBe("Olena");
    expect(c.companyFirstName).toBe("Pekka");
    expect(c.skills).toEqual(["Python"]);
    expect(c.table).toBe(2);
    expect(c.time).toBe("10:20");
    expect(c.expired).toBe(false);
    expect(JSON.stringify(c)).not.toMatch(/Kovalenko|Virtanen|example\.com/);
  });
  it("is null when not eligible", () => {
    expect(eventCardFor(db(), "nope", before)).toBeNull();
    expect(eventCardFor(db({ mode: "video" }), "mt-1", before)).toBeNull();
    expect(eventCardFor(db({ status: "pending" }), "mt-1", before)).toBeNull();
    expect(eventCardFor(db({ status: "cancelled" }), "mt-1", before)).toBeNull();
    expect(eventCardFor(db({ slotStart: "" }), "mt-1", before)).toBeNull();
    expect(eventCardFor(db({ table: 0 }), "mt-1", before)).toBeNull();
    expect(eventCardFor(db({}, { shortlists: [{ id: "s1", cardId: "c1", responseId: "r1", status: "invited" }] }), "mt-1", before)).toBeNull();
  });
  it("expires the day after the event (Helsinki)", () => {
    expect(eventCardFor(db(), "mt-1", T("2026-12-05T21:30:00Z"))!.expired).toBe(false); // 23:30 Helsinki
    expect(eventCardFor(db(), "mt-1", T("2026-12-05T22:30:00Z"))!.expired).toBe(true); // 00:30 next day
  });
});

describe("cardViewerSide", () => {
  const acc = (a: Partial<Account>): Account => ({ id: "x", email: "", role: "talent", displayName: "", createdAt: "", ...a });
  it("allows the owning talent, owning company and organiser only", () => {
    const d = db();
    expect(cardViewerSide(d, acc({ role: "talent", talentId: "t1" }), "mt-1")).toBe("talent");
    expect(cardViewerSide(d, acc({ role: "talent", talentId: "t2" }), "mt-1")).toBeNull();
    expect(cardViewerSide(d, acc({ role: "company", companyId: "co1" }), "mt-1")).toBe("company");
    expect(cardViewerSide(d, acc({ role: "company", companyId: "co2" }), "mt-1")).toBeNull();
    expect(cardViewerSide(d, acc({ role: "organiser" }), "mt-1")).toBe("organiser");
  });
});

describe("parseCardSkills", () => {
  const own = ["Python", "SQL", "Testing", "Teaching"];
  it("accepts up to 3 own skills", () => {
    expect(parseCardSkills({ skills: [] }, own)).toEqual({ ok: true, skills: [] });
    expect(parseCardSkills({ skills: ["Python", "SQL", "Testing"] }, own).ok).toBe(true);
  });
  it("rejects more than 3, unknown, duplicate, wrong types and extra keys", () => {
    expect(parseCardSkills({ skills: own }, own).ok).toBe(false);
    expect(parseCardSkills({ skills: ["Rust"] }, own).ok).toBe(false);
    expect(parseCardSkills({ skills: ["Python", "Python"] }, own).ok).toBe(false);
    expect(parseCardSkills({ skills: [1] }, own).ok).toBe(false);
    expect(parseCardSkills({ skills: "Python" }, own).ok).toBe(false);
    expect(parseCardSkills({ skills: [], extra: 1 }, own).ok).toBe(false);
    expect(parseCardSkills(null, own).ok).toBe(false);
    expect(parseCardSkills([], own).ok).toBe(false);
  });
});
