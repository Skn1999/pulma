// Goals and deadlines. Pure: no I/O, `now` is always passed in (ms since epoch) so tests are stable.
// Deadlines are promises people made; nothing here decides anything about a person.
import type { DB, HiringGoal, ProblemCard, Response, Shortlist } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const GOAL_LIMITS = { replyWithinDays: [1, 14], inviteDays: [1, 7] } as const;

export function defaultGoal(db: DB): HiringGoal {
  return { decideBy: db.event.date, replyWithinDays: 5, inviteDays: 3, meetModes: ["event"] };
}

/** The card's goal, filling any gaps with defaults (older cards have no goal). */
export function goalOf(card: ProblemCard, db: DB): HiringGoal {
  const d = defaultGoal(db);
  const g = card.goal;
  if (!g) return d;
  return {
    decideBy: g.decideBy || d.decideBy,
    replyWithinDays: g.replyWithinDays || d.replyWithinDays,
    inviteDays: g.inviteDays || d.inviteDays,
    meetModes: g.meetModes?.length ? g.meetModes : d.meetModes,
  };
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY).toISOString();
}

/** Whole days from a to b, rounded up (b later → positive). */
export function daysBetween(aMs: number, bMs: number): number {
  return Math.ceil((bMs - aMs) / DAY);
}

export function cardState(card: ProblemCard): "open" | "paused" | "filled" {
  return card.state ?? "open";
}

/** Published and open: can take new answers and new invites. */
export function isOpen(card: ProblemCard): boolean {
  return card.status === "published" && cardState(card) === "open";
}

export function replyDueAt(db: DB, r: Response): string {
  const card = db.cards.find((c) => c.id === r.cardId);
  const days = card ? goalOf(card, db).replyWithinDays : defaultGoal(db).replyWithinDays;
  return addDays(r.createdAt, days);
}

/**
 * When the company first replied to this answer: shortlisted, closed with "not this time", or the whole
 * problem paused/filled after the answer arrived (everyone with an answer is told). Undefined = no reply yet.
 */
export function repliedAt(db: DB, r: Response): string | undefined {
  const times: string[] = [];
  const sl = db.shortlists.find((s) => s.responseId === r.id);
  if (sl) {
    const t = sl.createdAt ?? db.activity.find((a) => a.kind === "shortlisted" && a.responseId === r.id)?.at;
    times.push(t ?? r.createdAt);
  }
  const cl = db.closures.find((c) => c.responseId === r.id);
  if (cl) times.push(cl.createdAt);
  const card = db.cards.find((c) => c.id === r.cardId);
  if (card && cardState(card) !== "open" && card.stateAt && card.stateAt > r.createdAt) times.push(card.stateAt);
  return times.sort()[0];
}

export type ReplyState = "replied" | "due" | "overdue" | "stepped_back";

export interface ReplyStatus {
  due: string; // ISO
  state: ReplyState;
  repliedAt?: string;
  onTime?: boolean; // only when replied
  daysLeft: number; // > 0 while due
  daysOver: number; // > 0 while overdue
}

export function replyStatus(db: DB, r: Response, now: number): ReplyStatus {
  const due = replyDueAt(db, r);
  const dueMs = Date.parse(due);
  const at = repliedAt(db, r);
  if (at) return { due, state: "replied", repliedAt: at, onTime: Date.parse(at) <= dueMs, daysLeft: 0, daysOver: 0 };
  if (r.steppedBack) return { due, state: "stepped_back", daysLeft: 0, daysOver: 0 };
  if (now > dueMs) return { due, state: "overdue", daysLeft: 0, daysOver: Math.max(1, Math.floor((now - dueMs) / DAY)) };
  return { due, state: "due", daysLeft: Math.max(1, daysBetween(now, dueMs)), daysOver: 0 };
}

export interface InviteStatus {
  respondBy: string;
  expired: boolean; // still "invited" after respondBy
  daysLeft: number;
}

export function inviteRespondBy(db: DB, sl: Shortlist): string {
  if (sl.respondBy) return sl.respondBy;
  const card = db.cards.find((c) => c.id === sl.cardId);
  const days = card ? goalOf(card, db).inviteDays : defaultGoal(db).inviteDays;
  const from = sl.createdAt ?? db.activity.find((a) => a.kind === "shortlisted" && a.responseId === sl.responseId)?.at;
  return addDays(from ?? new Date(0).toISOString(), days);
}

export function inviteStatus(db: DB, sl: Shortlist, now: number): InviteStatus {
  const respondBy = inviteRespondBy(db, sl);
  const ms = Date.parse(respondBy);
  const expired = sl.status === "invited" && now > ms;
  return { respondBy, expired, daysLeft: expired || sl.status !== "invited" ? 0 : Math.max(1, daysBetween(now, ms)) };
}

/**
 * A company's record of keeping its reply promise, across all its problems. This describes an
 * ORGANISATION's behaviour (shown to talent on its cards); it is never computed for a person.
 * rate is null until at least MIN_RECORD answers have a reply or a passed deadline.
 */
export const MIN_RECORD = 5;
export interface CompanyRecord {
  counted: number;
  onTime: number;
  late: number; // replied after the promise
  overdueNow: number; // promise passed, still no reply
  rate: number | null; // onTime / counted
}

export function companyRecord(db: DB, companyId: string, now: number): CompanyRecord {
  const cardIds = new Set(db.cards.filter((c) => c.companyId === companyId).map((c) => c.id));
  let counted = 0, onTime = 0, late = 0, overdueNow = 0;
  for (const r of db.responses) {
    if (!cardIds.has(r.cardId)) continue;
    const s = replyStatus(db, r, now);
    if (s.state === "replied") {
      counted++;
      if (s.onTime) onTime++;
      else late++;
    } else if (s.state === "overdue") {
      counted++;
      overdueNow++;
    }
  }
  return { counted, onTime, late, overdueNow, rate: counted >= MIN_RECORD ? onTime / counted : null };
}

/** Days until (positive) or past (negative) the decide-by date, counted from local midnight-ish. */
export function decideByDays(goal: HiringGoal, now: number): number {
  return daysBetween(now, Date.parse(`${goal.decideBy}T23:59:59`));
}

export interface GoalProgress {
  answers: number;
  replied: number; // shortlisted + closed (+ all, once paused/filled)
  awaitingReply: number;
  overdue: number;
  invited: number; // invites still open
  expired: number;
  accepted: number;
  meetingsBooked: number;
  decideByDays: number;
  state: "open" | "paused" | "filled";
}

export function goalProgress(db: DB, card: ProblemCard, now: number): GoalProgress {
  const answers = db.responses.filter((r) => r.cardId === card.id);
  let replied = 0, awaitingReply = 0, overdue = 0;
  for (const r of answers) {
    const s = replyStatus(db, r, now);
    if (s.state === "replied") replied++;
    else if (s.state === "overdue") { overdue++; awaitingReply++; }
    else if (s.state === "due") awaitingReply++;
  }
  const lists = db.shortlists.filter((s) => s.cardId === card.id);
  let invited = 0, expired = 0;
  for (const sl of lists) {
    if (sl.status !== "invited") continue;
    if (inviteStatus(db, sl, now).expired) expired++;
    else invited++;
  }
  const meetingsBooked = db.meetings.filter(
    (m) => m.cardId === card.id && m.slotStart && (m.status ?? "booked") === "booked",
  ).length;
  return {
    answers: answers.length,
    replied,
    awaitingReply,
    overdue,
    invited,
    expired,
    accepted: lists.filter((s) => s.status === "accepted").length,
    meetingsBooked,
    decideByDays: decideByDays(goalOf(card, db), now),
    state: cardState(card),
  };
}
