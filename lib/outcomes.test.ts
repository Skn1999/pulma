import { describe, expect, it } from "vitest";
import { seed } from "@/data/seed";
import { exampleAnswer, platformOutcomes } from "./outcomes";
import type { DB } from "./types";

describe("company-facing outcomes", () => {
  it("are aggregate counts with no names or emails", () => {
    const db = structuredClone(seed) as DB;
    const o = platformOutcomes(db, Date.parse("2026-11-14T10:00:00Z"));
    expect(o.problems).toBeGreaterThan(0);
    expect(o.answers).toBeGreaterThan(0);
    const json = JSON.stringify({ o, ex: exampleAnswer(db) });
    for (const t of db.talents) {
      expect(json).not.toContain(t.displayName);
      expect(json).not.toContain(t.email);
    }
  });
});
