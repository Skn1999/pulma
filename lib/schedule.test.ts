import { describe, expect, it } from "vitest";
import { buildSchedule } from "./schedule";
import type { DB, Event, Meeting, ProblemCard, Response } from "./types";

// Small inline fixture: 10:00-11:00 with 10-minute slots gives 6 slots per table, 2 tables.
const event: Event = {
  id: "ev-test",
  name: "Test Day",
  date: "2026-12-05",
  startTime: "10:00",
  endTime: "11:00",
  slotMinutes: 10,
  tables: 2,
};

const companies = [
  { id: "co1", name: "One", sector: "Clean-tech", size: "10", about: "" }, // table 1
  { id: "co2", name: "Two", sector: "Medtech", size: "10", about: "" }, // table 2
  { id: "co3", name: "Three", sector: "Robotics", size: "10", about: "" }, // table 1
];

function card(id: string, companyId: string): ProblemCard {
  return {
    id,
    companyId,
    title: `Card ${id}`,
    context: "",
    weekOneReality: "",
    hardPart: "",
    niceToHave: [],
    languages: ["English"],
    format: "onsite",
    status: "published",
    createdAt: "2026-11-01T09:00:00Z",
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
    createdAt: "2026-11-02T09:00:00Z",
  };
}

function meeting(id: string, cardId: string, responseId: string): Meeting {
  return { id, cardId, responseId, slotStart: "", table: 0 };
}

function makeDb(overrides: Partial<DB>): DB {
  return {
    companies,
    cards: [],
    talents: [],
    responses: [],
    shortlists: [],
    meetings: [],
    event,
    feedback: [],
    ...overrides,
    accounts: overrides.accounts ?? [],
  };
}

describe("buildSchedule", () => {
  // Five talents across two cards at co1 (table 1) and co2 (table 2), plus co3 (table 1).
  const cards = [card("cA", "co1"), card("cB", "co2"), card("cC", "co3")];
  const responses = [
    response("r1", "cA", "t1", "A1"),
    response("r2", "cA", "t2", "A2"),
    response("r3", "cB", "t1", "B1"),
    response("r4", "cB", "t3", "B2"),
    response("r5", "cC", "t2", "C1"),
    response("r6", "cC", "t4", "C2"),
    response("r7", "cA", "t5", "A3"),
    response("r8", "cB", "t4", "B3"),
  ];
  const meetings = [
    meeting("m1", "cA", "r1"),
    meeting("m2", "cA", "r2"),
    meeting("m3", "cB", "r3"),
    meeting("m4", "cB", "r4"),
    meeting("m5", "cC", "r5"),
    meeting("m6", "cC", "r6"),
    meeting("m7", "cA", "r7"),
    meeting("m8", "cB", "r8"),
  ];
  const db = makeDb({ cards, responses, meetings });

  it("never double-books a table or a talent", () => {
    const { slots } = buildSchedule(db);
    const tableKeys = slots.map((s) => `${s.table}|${s.start}`);
    const talentKeys = slots.map((s) => `${s.talentId}|${s.start}`);
    expect(new Set(tableKeys).size).toBe(tableKeys.length);
    expect(new Set(talentKeys).size).toBe(talentKeys.length);
  });

  it("keeps every slot inside event hours and slot length", () => {
    const { slots } = buildSchedule(db);
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.start.startsWith("2026-12-05T")).toBe(true);
      expect(s.start >= "2026-12-05T10:00:00").toBe(true);
      expect(s.end <= "2026-12-05T11:00:00").toBe(true);
      expect(s.end).toMatch(/^2026-12-05T\d{2}:\d{2}:00$/);
    }
  });

  it("assigns each company its fixed table", () => {
    const { slots } = buildSchedule(db);
    for (const s of slots) {
      const expected = s.companyId === "co2" ? 2 : 1;
      expect(s.table).toBe(expected);
    }
  });

  it("puts overflow into unscheduled", () => {
    // Single company, single table, 7 meetings for 6 slots.
    const oneCompanyCards = [card("cX", "co1")];
    const oneCompanyResponses = Array.from({ length: 7 }, (_, i) =>
      response(`rx${i + 1}`, "cX", `tx${i + 1}`, `X${i + 1}`),
    );
    const oneCompanyMeetings = Array.from({ length: 7 }, (_, i) =>
      meeting(`mx${i + 1}`, "cX", `rx${i + 1}`),
    );
    const result = buildSchedule(
      makeDb({ cards: oneCompanyCards, responses: oneCompanyResponses, meetings: oneCompanyMeetings }),
    );
    expect(result.slots).toHaveLength(6);
    expect(result.unscheduled).toEqual(["mx7"]);
  });

  it("sets arrival to 15 minutes before the talent's first slot", () => {
    const { slots, arrivals } = buildSchedule(db);
    for (const talentId of ["t1", "t2", "t3", "t4", "t5"]) {
      const talentSlots = slots.filter((s) => s.talentId === talentId).sort((a, b) => (a.start < b.start ? -1 : 1));
      expect(talentSlots.length).toBeGreaterThan(0);
      const first = talentSlots[0].start; // e.g. 2026-12-05T10:00:00
      const [datePart, timePart] = first.split("T");
      const [h, m] = timePart.split(":").map(Number);
      const expectedMinutes = h * 60 + m - 15;
      const expected = `${datePart}T${String(Math.floor(expectedMinutes / 60)).padStart(2, "0")}:${String(
        expectedMinutes % 60,
      ).padStart(2, "0")}:00`;
      expect(arrivals[talentId]).toBe(expected);
    }
    expect(arrivals.t1).toBe("2026-12-05T09:45:00");
  });

  it("is deterministic regardless of input order", () => {
    const reversed = makeDb({ cards, responses, meetings: [...meetings].reverse() });
    expect(buildSchedule(reversed)).toEqual(buildSchedule(db));
  });

  it("skips meetings whose response or card is missing", () => {
    const broken = makeDb({ cards, responses, meetings: [meeting("mz", "cA", "missing")] });
    const result = buildSchedule(broken);
    expect(result.slots).toHaveLength(0);
    expect(result.unscheduled).toEqual(["mz"]);
  });
});
