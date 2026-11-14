import { describe, expect, it } from "vitest";
import { getStats } from "./stats";
import type { DB, Event, ProblemCard, Response, Shortlist, Meeting } from "./types";

const event: Event = {
  id: "ev-test",
  name: "Test Day",
  date: "2026-12-05",
  startTime: "10:00",
  endTime: "14:00",
  slotMinutes: 10,
  tables: 6,
};

function card(
  id: string,
  companyId: string,
  status: ProblemCard["status"],
  languages: string[],
  createdAt: string,
  title: string,
): ProblemCard {
  return {
    id,
    companyId,
    title,
    context: "",
    weekOneReality: "",
    hardPart: "",
    niceToHave: [],
    languages,
    format: "online",
    status,
    createdAt,
  };
}

function response(id: string, cardId: string, talentId: string, publicCode: string): Response {
  return {
    id,
    publicCode,
    cardId,
    talentId,
    text: "",
    originalLanguage: "English",
    aiAssisted: false,
    createdAt: "2026-11-10T09:00:00Z",
  };
}

const db: DB = {
  accounts: [],
  companies: [
    { id: "co1", name: "One", sector: "Clean-tech", size: "10", about: "" },
    { id: "co2", name: "Two", sector: "Medtech", size: "10", about: "" },
    { id: "co3", name: "Three", sector: "Clean-tech", size: "10", about: "" },
  ],
  cards: [
    card("c1", "co1", "published", ["English", "Finnish"], "2026-11-05T09:00:00Z", "Battery sizing"),
    card("c2", "co2", "published", ["English"], "2026-11-25T09:00:00Z", "Sensor drift"),
    // Draft card: must be excluded from every count.
    card("c3", "co3", "draft", ["Swedish"], "2026-11-20T09:00:00Z", "Draft only"),
  ],
  talents: [],
  responses: [
    response("r1", "c1", "t1", "A1"),
    response("r2", "c1", "t2", "A2"),
    response("r3", "c2", "t3", "A1"),
    response("r4", "c3", "t4", "A1"), // on draft card: excluded
  ],
  shortlists: [
    { id: "s1", cardId: "c1", responseId: "r1", status: "invited" } satisfies Shortlist,
  ],
  meetings: [{ id: "m1", cardId: "c1", responseId: "r1", slotStart: "", table: 1 } satisfies Meeting],
  event,
  feedback: [],
};

describe("getStats", () => {
  const stats = getStats(db);

  it("counts only published cards and their related rows", () => {
    expect(stats.counts).toEqual({ cards: 2, responses: 3, shortlists: 1, meetings: 1 });
  });

  it("weights sectors by published card count, sorted desc", () => {
    expect(stats.sectors).toEqual([
      { name: "Clean-tech", count: 1 },
      { name: "Medtech", count: 1 },
    ]);
  });

  it("flattens card languages and sorts by count, excluding drafts", () => {
    expect(stats.languages).toEqual([
      { name: "English", count: 2 },
      { name: "Finnish", count: 1 },
    ]);
  });

  it("builds the timeline in createdAt order with whole days before the event", () => {
    expect(stats.timeline).toEqual([
      { cardId: "c1", title: "Battery sizing", createdAt: "2026-11-05T09:00:00Z", daysBeforeEvent: 30 },
      { cardId: "c2", title: "Sensor drift", createdAt: "2026-11-25T09:00:00Z", daysBeforeEvent: 10 },
    ]);
  });

  it("lists responses with no shortlist row, ordered by card then publicCode", () => {
    expect(stats.noInvite).toEqual([
      { responseId: "r2", publicCode: "A2", cardTitle: "Battery sizing", talentId: "t2" },
      { responseId: "r3", publicCode: "A1", cardTitle: "Sensor drift", talentId: "t3" },
    ]);
  });

  it("counts follow-ups: answered meetings and mutual next steps only", () => {
    const withFeedback: DB = {
      ...db,
      meetings: [
        ...db.meetings,
        { id: "m2", cardId: "c2", responseId: "r3", slotStart: "", table: 2 },
      ],
      feedback: [
        { id: "f1", meetingId: "m1", side: "company", outcome: "next-step" },
        { id: "f2", meetingId: "m1", side: "talent", outcome: "next-step" },
        { id: "f3", meetingId: "m2", side: "company", outcome: "next-step" },
        { id: "f4", meetingId: "m2", side: "talent", outcome: "not-now" },
      ],
    };
    expect(getStats(withFeedback).followUps).toEqual({ meetings: 2, answered: 2, mutualNextSteps: 1 });
    expect(stats.followUps).toEqual({ meetings: 1, answered: 0, mutualNextSteps: 0 });
  });
});
