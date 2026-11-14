// Shared data model. Source of truth: CLAUDE.md. Do not change without the orchestrator.

export type Format = "onsite" | "online" | "hybrid";

export interface Company {
  id: string;
  name: string;
  sector: string; // e.g. "Clean-tech"
  size: string; // e.g. "40 people"
  about: string;
}

export interface ProblemCard {
  id: string;
  companyId: string;
  title: string;
  context: string;
  weekOneReality: string;
  hardPart: string;
  niceToHave: string[];
  languages: string[]; // every working language that is realistic in the team, e.g. ["English", "Finnish"]
  languagesNeeded?: string[]; // subset of `languages` actually NEEDED for the work; the rest are nice to have
  format: Format;
  status: "draft" | "published";
  createdAt: string; // ISO
}

export interface Talent {
  id: string;
  displayName: string;
  email: string; // fake
  preferredLanguage?: string;
}

export interface Response {
  id: string;
  publicCode: string; // "A7", unique per card
  cardId: string;
  talentId: string;
  text: string;
  originalLanguage: string; // e.g. "Ukrainian"
  translatedText?: string;
  aiAssisted: boolean;
  createdAt: string;
  updatedAt?: string; // set when the talent edits the answer before any shortlist
}

export interface Shortlist {
  id: string;
  cardId: string;
  responseId: string;
  status: "invited" | "accepted" | "declined";
  note?: string; // private to the company
  message?: string; // optional one line from the company to the talent, shown with the invite (≤200 chars)
}

export interface Meeting {
  id: string;
  cardId: string;
  responseId: string;
  slotStart: string; // ISO, assigned by schedule
  table: number; // 1-based
}

export interface Event {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  slotMinutes: number; // 10
  tables: number; // 6
}

export interface Feedback {
  id: string;
  meetingId: string;
  side: "company" | "talent";
  outcome: "next-step" | "not-now";
  note?: string;
}

/**
 * A signed-in identity. One email = one account = one role, forever.
 * The role is set at registration and can never be changed (to act in another
 * role, register a different email). Email is stored lowercased + trimmed.
 */
export interface Account {
  id: string;
  email: string;
  role: Role;
  displayName: string; // person's name (for a company account: the hiring contact)
  companyId?: string; // role === "company"
  talentId?: string; // role === "talent"
  createdAt: string;
  notificationsSeenAt?: string; // ISO; activity after this counts as new for the bell
}

/** Company closes an answer it won't take forward: the person hears "not this time" instead of silence. */
export interface Closure {
  id: string;
  cardId: string;
  responseId: string;
  reason?: ClosureReason; // chosen by a human from a fixed list; never AI-generated
  createdAt: string;
}

export const CLOSURE_REASONS = [
  "We went with a different approach to this problem",
  "We had more strong answers than meetings",
  "The problem has changed on our side",
  "The timing isn't right for us",
] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];

export type ActivityKind =
  | "card_published"
  | "answer_sent"
  | "answer_edited"
  | "answer_withdrawn"
  | "shortlisted"
  | "shortlist_removed"
  | "message_updated"
  | "invite_accepted"
  | "invite_declined"
  | "answer_closed"
  | "answer_reopened"
  | "meeting_scheduled"
  | "mutual_next_step";

/**
 * Append-only log of what happened. Raw rows are NEVER sent to a client: use the
 * visibility helpers in lib/activity.ts, which decide what each account may see.
 */
export interface Activity {
  id: string;
  at: string; // ISO
  kind: ActivityKind;
  actor: Role; // who did it
  cardId: string;
  companyId: string;
  responseId?: string;
  talentId?: string;
}

/** One item as a specific viewer is allowed to see it. Safe to send to that viewer. */
export interface ActivityView {
  id: string;
  at: string;
  kind: ActivityKind;
  byMe: boolean;
  text: string; // already worded for this viewer, e.g. "Kiertovolt shortlisted your answer #A3"
  href?: string; // where this viewer should go to see it
}

export interface DB {
  accounts: Account[];
  companies: Company[];
  cards: ProblemCard[];
  talents: Talent[];
  responses: Response[];
  shortlists: Shortlist[];
  meetings: Meeting[];
  event: Event;
  feedback: Feedback[];
  closures: Closure[];
  activity: Activity[];
}

/** What a company is allowed to see in the blind round. No talentId, no identity. */
export interface BlindResponse {
  id: string;
  publicCode: string;
  text: string;
  originalLanguage: string;
  translatedText?: string;
  aiAssisted: boolean;
  shortlist?: { status: Shortlist["status"]; note?: string; message?: string };
  closed?: { id: string; reason?: string };
}

/** Problem card fields the AI generates from the intake. */
export type CardDraft = Pick<
  ProblemCard,
  "title" | "context" | "weekOneReality" | "hardPart" | "niceToHave" | "languages" | "languagesNeeded" | "format"
>;

export interface IntakeAnswers {
  problem: string;
  firstWeek: string;
  hardPart: string;
  bonus: string;
  languages: string;
}

export type Role = "company" | "talent" | "organiser";
