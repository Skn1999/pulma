import { describe, expect, it } from "vitest";
import { fallbackExtract, parseSkillsInput, relatedSkillLabels, skillMatches } from "./skills";
import { buildBlindResponses } from "./blind-responses";
import { buildThread } from "./thread";
import { nextSteps } from "./next-steps";
import { extractSkills } from "./ai";
import type { Account, DB } from "./types";

const skill = (label: string) => ({ label, source: "self" as const, addedAt: "2026-11-01T00:00:00Z" });

describe("skillMatches", () => {
  it("matches equal tags ignoring case", () => {
    expect(skillMatches([skill("python")], ["Python", "SQL"])).toEqual(["Python"]);
  });
  it("matches when a meaningful word is shared", () => {
    expect(skillMatches([skill("Cleaning messy sensor data")], ["Messy sensor data", "Welding"])).toEqual(["Messy sensor data"]);
  });
  it("ignores short and stopwords", () => {
    expect(skillMatches([skill("Work with people")], ["Working with machines", "Team work"])).toEqual([]);
  });
  it("returns nothing without skills or tags and keeps card order", () => {
    expect(skillMatches(undefined, ["A"])).toEqual([]);
    expect(skillMatches([skill("x")], undefined)).toEqual([]);
    expect(skillMatches([skill("Python"), skill("Testing")], ["Software testing", "Python"])).toEqual(["Software testing", "Python"]);
  });
  it("relatedSkillLabels returns the talent's own labels", () => {
    expect(relatedSkillLabels([skill("Cleaning messy sensor data"), skill("Knitting")], ["Messy sensor data"])).toEqual(["Cleaning messy sensor data"]);
  });
});

describe("fallbackExtract", () => {
  it("finds vocabulary terms, case-insensitively", () => {
    const out = fallbackExtract("I wrote python and SQL for sensor data, plus technical translation. Also teaching.");
    expect(out).toEqual(expect.arrayContaining(["Python", "SQL", "Sensor data", "Technical translation", "Teaching"]));
  });
  it("does not match inside words and caps at 12", () => {
    expect(fallbackExtract("Javascripted gitlab")).toEqual([]);
    const all = "Python SQL Excel JavaScript TypeScript React Java Rust Unity Statistics Robotics CAD Prototyping Teaching";
    expect(fallbackExtract(all)).toHaveLength(12);
  });
  it("extractSkills falls back offline without a key", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const r = await extractSkills("Built Python tools for data analysis.");
    process.env.ANTHROPIC_API_KEY = saved;
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    expect(r.fallback).toBe(true);
    expect(r.suggestions).toContain("Python");
  });
});

describe("parseSkillsInput", () => {
  it("validates, de-duplicates and keeps addedAt", () => {
    const r = parseSkillsInput({ skills: [{ label: " Python ", source: "cv" }, { label: "python", source: "self" }] }, [skill("Python")], "NOW");
    expect(r).toEqual({ ok: true, skills: [{ label: "Python", source: "cv", addedAt: "2026-11-01T00:00:00Z" }] });
  });
  it("rejects too many, too long and bad sources", () => {
    const many = Array.from({ length: 16 }, (_, i) => ({ label: `s${i}`, source: "self" }));
    expect(parseSkillsInput({ skills: many }, undefined, "NOW").ok).toBe(false);
    expect(parseSkillsInput({ skills: [{ label: "x".repeat(61), source: "self" }] }, undefined, "NOW").ok).toBe(false);
    expect(parseSkillsInput({ skills: [{ label: "ok", source: "other" }] }, undefined, "NOW").ok).toBe(false);
  });
});

function makeDb(): DB {
  return {
    accounts: [],
    companies: [{ id: "co1", name: "Kiertovolt", sector: "Clean-tech", size: "40", about: "" }],
    cards: [{ id: "c1", companyId: "co1", title: "Battery data", context: "", weekOneReality: "", hardPart: "", niceToHave: [], languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-01T09:00:00Z", skills: ["Python"] }],
    talents: [{ id: "t1", displayName: "Olena Kovalenko", email: "olena@example.com", skills: [skill("Battery data analysis"), skill("Zebra wrangling")] }],
    responses: [{ id: "r1", publicCode: "A3", cardId: "c1", talentId: "t1", text: "I would start with the logs.", originalLanguage: "English", aiAssisted: false, createdAt: "2026-11-02T09:00:00Z" }],
    shortlists: [{ id: "s1", cardId: "c1", responseId: "r1", status: "accepted" }],
    meetings: [],
    events: [{ id: "e", name: "E", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6, venue: "Hall (demo venue)" }],
    feedback: [], closures: [], activity: [], availability: [],
  };
}

describe("skills never reach a company", () => {
  const company: Account = { id: "a1", email: "c@x", role: "company", displayName: "Boss", companyId: "co1", createdAt: "" };
  const organiser: Account = { id: "a4", email: "e@x", role: "organiser", displayName: "Events", createdAt: "" };
  const talent: Account = { id: "a2", email: "o@x", role: "talent", displayName: "Olena", talentId: "t1", createdAt: "" };

  it("the responses payload has no skills", () => {
    const db = makeDb();
    const json = JSON.stringify(buildBlindResponses(db, db.cards[0], Date.now()));
    expect(json).not.toContain("Battery data analysis");
    expect(json).not.toContain("Zebra wrangling");
    expect(json).not.toContain("skills");
  });
  it("the company thread (even after names are revealed) has no skills", () => {
    const db = makeDb();
    const json = JSON.stringify(buildThread(db, company, "r1"));
    expect(json).toContain("Olena"); // revealed by mutual opt-in, but only the name
    expect(json).not.toContain("Battery data analysis");
    expect(json).not.toContain("Zebra wrangling");
    expect(json).not.toContain("skills");
  });
  it("company and organiser next steps never mention skills", () => {
    const db = makeDb();
    const now = Date.parse("2026-11-20T10:00:00Z");
    expect(JSON.stringify(nextSteps(db, company, now)).toLowerCase()).not.toContain("skill");
    expect(JSON.stringify(nextSteps(db, organiser, now)).toLowerCase()).not.toContain("skill");
  });
  it("talent without skills gets the add-skills step last; with skills they do not", () => {
    const db = makeDb();
    const now = Date.parse("2026-11-20T10:00:00Z");
    expect(nextSteps(db, talent, now).waitingOnYou.some((s) => s.id === "add-skills")).toBe(false);
    db.talents[0].skills = undefined;
    const steps = nextSteps(db, talent, now).waitingOnYou;
    expect(steps[steps.length - 1]).toMatchObject({ id: "add-skills", href: "/profile#skills" });
  });
});
