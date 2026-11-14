import { describe, expect, it } from "vitest";
import { seed } from "@/data/seed";
import { exampleAnswer } from "./outcomes";
import type { DB } from "./types";

describe("example answer shown to companies", () => {
  it("is anonymous: no names or emails", () => {
    const db = structuredClone(seed) as DB;
    const ex = exampleAnswer(db);
    expect(ex?.text.length).toBeGreaterThan(0);
    const json = JSON.stringify(ex);
    for (const t of db.talents) {
      expect(json).not.toContain(t.displayName);
      expect(json).not.toContain(t.email);
    }
  });
});
