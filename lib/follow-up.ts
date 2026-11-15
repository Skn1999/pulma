// After the meeting: next-step promises and outcomes. Pure: no I/O, `now` is always passed in.
// A company promises what happens next and by when; people record how it went. Nothing is inferred
// and nothing here ranks or filters a person.
import { helsinkiToday } from "./events";
import { NEXT_STEP_MAX_DAYS, type DB, type Meeting, type MeetingOutcome } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** True once BOTH sides chose "next-step" after the meeting (the existing mutual rule). */
export function isMutual(db: DB, meetingId: string): boolean {
  const fb = db.feedback.filter((f) => f.meetingId === meetingId);
  return fb.some((f) => f.side === "company" && f.outcome === "next-step") && fb.some((f) => f.side === "talent" && f.outcome === "next-step");
}

/** An outcome that ends the follow-up. still_talking keeps the plan open. */
export function isFinal(outcome: MeetingOutcome | undefined): boolean {
  return !!outcome && outcome.kind !== "still_talking";
}

/** Whole days from one "YYYY-MM-DD" to another (b later → positive). */
export function daysBetweenDates(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
}

export function addDaysToDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** The dates a company may promise: tomorrow … 30 days from today (Helsinki). */
export function nextStepWindow(now: number): { min: string; max: string } {
  const today = helsinkiToday(now);
  return { min: addDaysToDate(today, 1), max: addDaysToDate(today, NEXT_STEP_MAX_DAYS) };
}

export function validBy(by: unknown, now: number): by is string {
  if (typeof by !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(by)) return false;
  if (Number.isNaN(Date.parse(`${by}T00:00:00Z`)) || addDaysToDate(by, 0) !== by) return false;
  const w = nextStepWindow(now);
  return by >= w.min && by <= w.max;
}

export type NextStepState = "none" | "planned" | "overdue" | "still_talking" | "done";

export interface NextStepStatus {
  state: NextStepState;
  by?: string;
  daysLeft: number; // ≥ 0 while planned / still talking (0 = today)
  daysOver: number; // > 0 while overdue
  outcome?: MeetingOutcome;
}

/**
 * none = no plan and no outcome. done = a final outcome (hired, not this time, talent took another job).
 * overdue = Helsinki today is past `by` with no final outcome. still_talking = the company said so and set a new
 * date that has not passed yet. planned = a plan with a date still ahead.
 */
export function nextStepStatus(meeting: Meeting, now: number): NextStepStatus {
  const outcome = meeting.outcome;
  if (isFinal(outcome)) return { state: "done", by: meeting.nextStep?.by, daysLeft: 0, daysOver: 0, outcome };
  const plan = meeting.nextStep;
  if (!plan) return { state: "none", daysLeft: 0, daysOver: 0 };
  const diff = daysBetweenDates(helsinkiToday(now), plan.by);
  if (diff < 0) return { state: "overdue", by: plan.by, daysLeft: 0, daysOver: -diff, ...(outcome ? { outcome } : {}) };
  return { state: outcome ? "still_talking" : "planned", by: plan.by, daysLeft: diff, daysOver: 0, ...(outcome ? { outcome } : {}) };
}

/** Did a promised date already pass at this moment? (Used to remember a missed promise.) */
export function isPastBy(plan: { by: string }, now: number): boolean {
  return helsinkiToday(now) > plan.by;
}

/** When the company's promise expired, as an ISO instant (end of the promised day, Helsinki ≈ 21:00 UTC). */
export function overdueAt(by: string): string {
  return `${by}T21:00:00.000Z`;
}

export function outcomeText(o: MeetingOutcome, viewer: "company" | "talent"): string {
  switch (o.kind) {
    case "hired":
      return "Hired";
    case "still_talking":
      return "Still talking";
    case "not_this_time":
      return `Not this time${o.reason ? `: ${o.reason}` : ""}`;
    case "talent_withdrew":
      return viewer === "talent" ? "You took another job" : "They took another job";
  }
}

export const PAY_SUBSIDY_URL = "https://www.espoo.fi/en/business-espoo-helping-companies-thrive/financial-support-and-employment";
