// One anonymous example answer shown to companies on an invitation ("What would we read?"). Pure.
import { MIN_RECORD, replyStatus } from "./deadlines";
import { eventById, eventOf, helsinkiToday } from "./events";
import { addDaysToDate, isMutual, nextStepStatus } from "./follow-up";
import { localNow, meetingStatus } from "./slots";
import { NEXT_STEP_KINDS, type DB, type Event, type NextStepKind, type OutcomeReport } from "./types";

const DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_FOLLOW_UP_DAYS = 60;

/**
 * One example answer to show companies what they will read. Chosen by hand for the demo (fictional data);
 * in a real deployment it would be shared only with the author's explicit permission.
 */
export const EXAMPLE_ANSWER_ID = "r-l2";

export function exampleAnswer(db: DB): { problemTitle: string; text: string } | null {
  const r = db.responses.find((x) => x.id === EXAMPLE_ANSWER_ID);
  const card = r && db.cards.find((c) => c.id === r.cardId);
  return r && card ? { problemTitle: card.title, text: r.text } : null;
}

// ---- After the event: the anonymous outcome report and the follow-up window ----
// Counts and problem titles only. Nothing here names, ranks or filters a person.

/** Last day people can still record outcomes: the event date plus followUpDays. */
export function followUpEnd(ev: Event): string {
  return addDaysToDate(ev.date, ev.followUpDays ?? DEFAULT_FOLLOW_UP_DAYS);
}

export type FollowUpState = "before" | "settling" | "final";

/** before = the event has not happened yet. settling = window open, figures still change. final = closed, snapshot only. */
export function followUpState(ev: Event, now: number): FollowUpState {
  if (ev.report) return "final";
  return helsinkiToday(now) < ev.date ? "before" : "settling";
}

/** Events whose window has ended but are not closed yet. */
export function followUpsDue(db: DB, now: number): Event[] {
  const today = helsinkiToday(now);
  return db.events.filter((e) => !e.report && followUpState(e, now) === "settling" && today > followUpEnd(e));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const pct = (part: number, whole: number) => (whole >= MIN_RECORD ? Math.round((part / whole) * 100) : null);

export function eventOutcomes(db: DB, eventId: string, now: number): OutcomeReport {
  const cards = db.cards.filter((c) => c.status === "published" && eventOf(db, c).id === eventId);
  const cardIds = new Set(cards.map((c) => c.id));
  const responses = db.responses.filter((r) => cardIds.has(r.cardId));
  const meetings = db.meetings.filter((m) => cardIds.has(m.cardId));
  const shortlists = db.shortlists.filter((s) => cardIds.has(s.cardId));
  const nowLocal = localNow(now);

  const nextStepPlanned = Object.fromEntries(NEXT_STEP_KINDS.map((k) => [k, 0])) as Record<NextStepKind, number>;
  for (const m of meetings) if (m.nextStep) nextStepPlanned[m.nextStep.kind]++;
  const outcomeCount = (k: string) => meetings.filter((m) => m.outcome?.kind === k).length;

  // Reply promises: how long companies took, and how many kept the time they promised.
  const replyDays: number[] = [];
  let replyCounted = 0, replyOnTime = 0, overdueNow = 0;
  for (const r of responses) {
    const s = replyStatus(db, r, now);
    if (s.state === "replied" && s.repliedAt) {
      replyCounted++;
      if (s.onTime) replyOnTime++;
      replyDays.push(Math.max(0, (Date.parse(s.repliedAt) - Date.parse(r.createdAt)) / DAY));
    } else if (s.state === "overdue") {
      replyCounted++;
      overdueNow++;
    }
  }
  // Next-step promises, same rule as a company's record: kept = recorded or re-planned before the date.
  let nsCounted = 0, nsKept = 0;
  for (const m of meetings) {
    const plan = m.nextStep;
    if (!plan) continue;
    if (nextStepStatus(m, now).state === "overdue") {
      nsCounted++;
      overdueNow++;
    } else if (plan.missed) {
      nsCounted++;
    } else if ((m.outcome && m.outcome.kind !== "talent_withdrew") || plan.updatedAt) {
      nsCounted++;
      nsKept++;
    }
  }

  const problemsWithoutNextStep = cards
    .filter((c) => !meetings.some((m) => m.cardId === c.id && m.nextStep))
    .map((c) => ({ cardId: c.id, title: c.title, companyName: db.companies.find((co) => co.id === c.companyId)?.name ?? "" }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, "en") || a.title.localeCompare(b.title, "en"));

  return {
    asOf: new Date(now).toISOString(),
    funnel: {
      problems: cards.length,
      answers: responses.length,
      shortlisted: shortlists.length,
      accepted: shortlists.filter((s) => s.status === "accepted").length,
      meetingsHeld: meetings.filter((m) => meetingStatus(m) === "booked" && m.slotStart && m.slotStart <= nowLocal).length,
      nextStepAgreed: meetings.filter((m) => isMutual(db, m.id)).length,
      nextStepPlanned,
      hired: outcomeCount("hired"),
      stillTalking: outcomeCount("still_talking"),
      notThisTime: outcomeCount("not_this_time"),
      talentWithdrew: outcomeCount("talent_withdrew"),
    },
    promises: {
      medianReplyDays: replyDays.length >= MIN_RECORD ? Math.round(median(replyDays) * 10) / 10 : null,
      replyKeptPct: pct(replyOnTime, replyCounted),
      nextStepKeptPct: pct(nsKept, nsCounted),
      overdueNow,
    },
    problemsWithoutNextStep,
  };
}

/** The funnel figures that make sense for a quick "hired / next steps / promises kept" summary. */
export function nextStepsPlannedTotal(r: OutcomeReport): number {
  return NEXT_STEP_KINDS.reduce((n, k) => n + r.funnel.nextStepPlanned[k], 0);
}

/**
 * Close the follow-up window: keep the anonymous snapshot, delete that event's personal data. Problem cards stay
 * (they describe companies); accounts and talents stay (they may take part in other events). Returns false when
 * the event is unknown or already closed.
 */
export function closeFollowUp(db: DB, eventId: string, now: number): boolean {
  const ev = eventById(db, eventId);
  if (!ev || ev.report) return false;
  const report = eventOutcomes(db, eventId, now);
  const cardIds = new Set(db.cards.filter((c) => eventOf(db, c).id === eventId).map((c) => c.id));
  const responseIds = new Set(db.responses.filter((r) => cardIds.has(r.cardId)).map((r) => r.id));
  const meetingIds = new Set(db.meetings.filter((m) => cardIds.has(m.cardId) || responseIds.has(m.responseId)).map((m) => m.id));
  db.responses = db.responses.filter((r) => !responseIds.has(r.id));
  db.shortlists = db.shortlists.filter((s) => !cardIds.has(s.cardId) && !responseIds.has(s.responseId));
  db.meetings = db.meetings.filter((m) => !meetingIds.has(m.id));
  db.feedback = db.feedback.filter((f) => !meetingIds.has(f.meetingId));
  db.closures = db.closures.filter((c) => !cardIds.has(c.cardId) && !responseIds.has(c.responseId));
  db.activity = db.activity.filter((a) => !(a.responseId && responseIds.has(a.responseId)));
  ev.report = report;
  ev.closedAt = new Date(now).toISOString();
  return true;
}

/** Close every event whose follow-up window has ended. Call inside mutate(). Returns how many were closed. */
export function sweepFollowUps(db: DB, now: number): number {
  let n = 0;
  for (const ev of followUpsDue(db, now)) if (closeFollowUp(db, ev.id, now)) n++;
  return n;
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "not enough data" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** metric,value rows. Counts, percentages and problem titles with company names only. */
export function reportCsv(ev: Event, r: OutcomeReport): string {
  const f = r.funnel;
  const rows: [string, string | number | null][] = [
    ["event", ev.name],
    ["as of", r.asOf],
    ["problems", f.problems],
    ["answers", f.answers],
    ["shortlisted", f.shortlisted],
    ["accepted", f.accepted],
    ["meetings held", f.meetingsHeld],
    ["next step agreed by both", f.nextStepAgreed],
    ...NEXT_STEP_KINDS.map((k): [string, number] => [`next step planned: ${k}`, f.nextStepPlanned[k]]),
    ["hired", f.hired],
    ["still talking", f.stillTalking],
    ["not this time", f.notThisTime],
    ["candidate took another job", f.talentWithdrew],
    ["median days to reply", r.promises.medianReplyDays],
    ["reply promises kept %", r.promises.replyKeptPct],
    ["next-step promises kept %", r.promises.nextStepKeptPct],
    ["promises overdue now", r.promises.overdueNow],
    ...r.problemsWithoutNextStep.map((p): [string, string] => ["problem with no next step", `${p.title} (${p.companyName})`]),
  ];
  return ["metric,value", ...rows.map(([k, v]) => `${csvCell(k)},${csvCell(v)}`)].join("\n") + "\n";
}
