// Validation for a company's HiringGoal coming from a request body. Server only (no I/O).
import { GOAL_LIMITS } from "./deadlines";
import { MEET_MODES, type HiringGoal, type MeetMode } from "./types";

export type GoalResult = { ok: true; goal: HiringGoal } | { ok: false; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Validate a full or partial goal. Missing fields fall back to `base`; present-but-invalid fields are errors. */
export function parseGoal(input: unknown, base: HiringGoal): GoalResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "goal must be an object" };
  const b = input as Record<string, unknown>;
  const goal: HiringGoal = { ...base, meetModes: [...base.meetModes] };

  if ("decideBy" in b) {
    const d = b.decideBy;
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T12:00:00Z`)))
      return { ok: false, error: "Choose a valid decide-by date" };
    goal.decideBy = d;
  }
  if ("replyWithinDays" in b) {
    const [lo, hi] = GOAL_LIMITS.replyWithinDays;
    if (!isInt(b.replyWithinDays) || b.replyWithinDays < lo || b.replyWithinDays > hi)
      return { ok: false, error: `Reply promise must be ${lo} to ${hi} days` };
    goal.replyWithinDays = b.replyWithinDays;
  }
  if ("inviteDays" in b) {
    const [lo, hi] = GOAL_LIMITS.inviteDays;
    if (!isInt(b.inviteDays) || b.inviteDays < lo || b.inviteDays > hi)
      return { ok: false, error: `Invites must stay open ${lo} to ${hi} days` };
    goal.inviteDays = b.inviteDays;
  }
  if ("meetModes" in b) {
    const m = b.meetModes;
    if (!Array.isArray(m) || m.length === 0 || !m.every((x) => MEET_MODES.includes(x as MeetMode)))
      return { ok: false, error: "Choose at least one way to meet" };
    goal.meetModes = MEET_MODES.filter((x) => m.includes(x));
  }
  return { ok: true, goal };
}
