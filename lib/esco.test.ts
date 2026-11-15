import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEscoCache, escoExact, fallbackSuggest, suggestSkills } from "./esco";
import { skillMatches } from "./skills";
import { MIN_SUPPLY, skillSupplyDemand, supplyText } from "./supply-demand";
import { buildBlindResponses } from "./blind-responses";
import { buildThread } from "./thread";
import type { Account, DB, EscoRef, TalentSkill } from "./types";

const PY: EscoRef = { uri: "http://data.europa.eu/esco/skill/ccd0a1d9-afda-43d9-b901-96344886e14d", label: "Python (computer programming)" };

describe("suggestSkills", () => {
  beforeEach(() => clearEscoCache());
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to the bundled list when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const r = await suggestSkills("pytho");
    expect(r.map((s) => s.label)).toContain("Python (computer programming)");
    expect(r.length).toBeLessThanOrEqual(8);
  });

  it("falls back when the request times out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_u: string, init: { signal: AbortSignal }) => new Promise((_res, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted"))))));
    const p = suggestSkills("sql");
    await vi.advanceTimersByTimeAsync(2600);
    expect((await p).some((s) => s.label === "SQL")).toBe(true);
    vi.useRealTimers();
  });

  it("falls back on a bad status or odd payload, and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    expect((await suggestSkills("robot")).length).toBeGreaterThan(0);
    clearEscoCache();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => "nonsense" }));
    expect(Array.isArray(await suggestSkills("robot"))).toBe(true);
  });

  it("uses live results and caches them", async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { results: [{ uri: PY.uri, title: PY.label, preferredLabel: { en: "Python" } }, { uri: "not-esco", title: "x" }] } }),
    });
    vi.stubGlobal("fetch", f);
    expect(await suggestSkills("python")).toEqual([PY]);
    await suggestSkills("Python");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("returns nothing for very short text", async () => {
    expect(await suggestSkills("p")).toEqual([]);
    expect(fallbackSuggest(" ")).toEqual([]);
  });

  it("escoExact ignores case and a trailing qualifier", () => {
    expect(escoExact("python")?.uri).toBe(PY.uri);
    expect(escoExact("Zebra wrangling")).toBeUndefined();
  });
});

describe("skillMatches with ESCO", () => {
  const mine = (label: string, esco?: EscoRef): TalentSkill => ({ label, esco, source: "self", addedAt: "" });

  it("matches by uri first, even when the words differ", () => {
    expect(skillMatches([mine("Scripting in snakes", PY)], ["Python"], [{ label: "Python", esco: PY }])).toEqual(["Python"]);
  });
  it("a different uri does not match by uri, and the word rule still applies", () => {
    const other: EscoRef = { uri: "http://data.europa.eu/esco/skill/other", label: "Other" };
    expect(skillMatches([mine("Alpha", other)], ["Python"], [{ label: "Python", esco: PY }])).toEqual([]);
    expect(skillMatches([mine("Python", other)], ["Python"], [{ label: "Python", esco: PY }])).toEqual(["Python"]);
  });
});

function sdDb(candidates: number, skillOnCard = "Python"): DB {
  const talents = Array.from({ length: candidates }, (_, i) => ({
    id: `t${i}`, displayName: `Person ${i}`, email: `p${i}@example.com`,
    skills: [{ label: "Python", esco: PY, source: "self" as const, addedAt: "" }],
  }));
  return {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" }],
    cards: [
      { id: "c1", companyId: "co1", title: "A", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z", eventId: "e", skills: [skillOnCard], skillRefs: [{ label: skillOnCard, esco: PY }] },
      { id: "c2", companyId: "co1", title: "B", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z", eventId: "other", skills: ["Python"] },
    ],
    talents: [...talents, { id: "outsider", displayName: "Out", email: "o@example.com", skills: [{ label: "Python", esco: PY, source: "self", addedAt: "" }] }],
    responses: talents.map((t, i) => ({ id: `r${i}`, publicCode: `A${i}`, cardId: "c1", talentId: t.id, text: "x", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T09:00:00Z" })),
    shortlists: [], meetings: [],
    events: [
      { id: "e", name: "E", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall", stage: "open" as const, problemDeadline: "2026-11-21" },
      { id: "other", name: "O", date: "2026-12-06", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall", stage: "open" as const, problemDeadline: "2026-11-21" },
    ],
    feedback: [], closures: [], activity: [], availability: [], participations: [],
  };
}

describe("skillSupplyDemand", () => {
  it("shows 'fewer than 5' under the threshold, hiding even a zero or a four", () => {
    for (const n of [0, 1, MIN_SUPPLY - 1]) {
      const rows = skillSupplyDemand(sdDb(n), "e");
      expect(rows[0].supply).toBeNull();
      expect(supplyText(rows[0].supply)).toBe("fewer than 5");
      expect(JSON.stringify(rows)).not.toMatch(new RegExp(`"supply":${n}\\b`));
    }
  });
  it("shows the exact count from 5 and counts only candidates who answered in this event", () => {
    const rows = skillSupplyDemand(sdDb(5), "e"); // the outsider has the skill but answered nothing
    expect(rows[0]).toMatchObject({ label: "Python (computer programming)", demand: 1, supply: 5, esco: true });
    expect(skillSupplyDemand(sdDb(6), "e")[0].supply).toBe(6);
  });
  it("counts demand only for the selected event and lists no people", () => {
    const db = sdDb(7);
    const json = JSON.stringify(skillSupplyDemand(db, "e"));
    expect(skillSupplyDemand(db, "other")[0]).toMatchObject({ demand: 1, supply: null });
    expect(json).not.toContain("Person");
    expect(json).not.toContain("t1");
  });
});

describe("ESCO skills never reach a company", () => {
  it("blind responses and the thread carry no skills, ESCO labels or uris", () => {
    const db = sdDb(1);
    db.accounts = [{ id: "a1", email: "c@x", role: "company", displayName: "Boss", companyId: "co1", createdAt: "" }];
    db.shortlists = [{ id: "s1", cardId: "c1", responseId: "r0", status: "accepted" }];
    const company = db.accounts[0] as Account;
    const json = JSON.stringify([buildBlindResponses(db, db.cards[0], Date.now()), buildThread(db, company, "r0")]);
    expect(json).not.toContain("esco");
    expect(json).not.toContain("Python (computer programming)");
  });
});
