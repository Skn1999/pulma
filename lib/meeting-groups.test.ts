import { describe, expect, it } from "vitest";
import { seed } from "@/data/seed";
import type { DB } from "./types";
import { meetingsByEvent } from "./meeting-groups";

const db = () => structuredClone(seed) as DB;
const NOW = Date.parse("2026-11-15T10:00:00Z");

describe("meetingsByEvent", () => {
  it("groups a candidate's meetings by their problem's event, upcoming first, and never mixes in others' meetings", () => {
    const d = db();
    const olena = d.talents.find((t) => t.displayName.startsWith("Olena"))!;
    const groups = meetingsByEvent(d, { role: "talent", talentId: olena.id }, NOW);
    const rows = groups.flatMap((g) => [...g.eventDay, ...g.elsewhere, ...g.toArrange, ...g.cancelled]);
    const own = d.meetings.filter((m) => d.responses.find((r) => r.id === m.responseId)?.talentId === olena.id);
    expect(rows.map((r) => r.meeting.id).sort()).toEqual(own.map((m) => m.id).sort());
    const firstPast = groups.findIndex((g) => g.past);
    if (firstPast >= 0) expect(groups.slice(firstPast).every((g) => g.past)).toBe(true);
    for (const g of groups) for (const r of g.eventDay) expect(r.mode).toBe("event");
  });

  it("gives a company only its own meetings, without cancelled ones, and its table per event", () => {
    const d = db();
    const companyId = d.companies[0].id;
    const groups = meetingsByEvent(d, { role: "company", companyId }, NOW);
    for (const g of groups) {
      expect(g.cancelled).toHaveLength(0);
      for (const r of [...g.eventDay, ...g.elsewhere, ...g.toArrange]) {
        expect(d.cards.find((c) => c.id === r.cardId)?.companyId).toBe(companyId);
      }
    }
  });

  it("keeps event-day meetings in time order", () => {
    const d = db();
    for (const t of d.talents) {
      for (const g of meetingsByEvent(d, { role: "talent", talentId: t.id }, NOW)) {
        const starts = g.eventDay.map((r) => r.start ?? "");
        expect([...starts].sort()).toEqual(starts);
      }
    }
  });
});
