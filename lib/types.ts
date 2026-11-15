// Shared data model. Source of truth: CLAUDE.md. Do not change without the orchestrator.

export type Format = "onsite" | "online" | "hybrid";

/** How two people can meet. "event" = a 10-minute table slot on the event day. */
export type MeetMode = "event" | "office" | "video";
export const MEET_MODES: MeetMode[] = ["event", "office", "video"];
export const MEET_MODE_LABEL: Record<MeetMode, string> = {
  event: "Event day table",
  office: "Office visit",
  video: "Video call",
};

/**
 * The company's stated goal for one problem. It is a PUBLIC promise: talent see the reply promise
 * and decide-by date on the card. It drives deadlines and next steps, never who is shown.
 */
export interface HiringGoal {
  decideBy: string; // "YYYY-MM-DD"
  replyWithinDays: number; // 1–14: every answer gets a reply (shortlist or "not this time") within this
  inviteDays: number; // 1–7: how long an invite stays open before it expires
  meetModes: MeetMode[]; // non-empty
}

export type CardState = "open" | "paused" | "filled";
export const PAUSE_REASONS = [
  "Budget is on hold",
  "Team priorities changed",
  "We need to rethink the problem",
] as const;
export const FILLED_REASONS = [
  "We found someone through Pulma",
  "We found someone another way",
  "We solved it inside the team",
] as const;
/** Set by the system, never chosen by a company: it left the event. */
export const WITHDRAWN_REASON = "The company is no longer taking part in this event" as const;
export type CardStateReason = (typeof PAUSE_REASONS)[number] | (typeof FILLED_REASONS)[number] | typeof WITHDRAWN_REASON;

/**
 * The talent's own goal. PRIVATE: never sent to a company, never used to filter or order anyone.
 * It only shapes the talent's own home screen and which meeting options are offered first.
 */
export interface TalentGoal {
  status: "active" | "open" | "exploring"; // actively looking / open to the right thing / just exploring
  availableFrom?: string; // "YYYY-MM-DD"
  meetModes: MeetMode[]; // ways the talent is happy to meet (may be empty = any)
  updatedAt: string;
}

/** A window when a company can meet outside the event day. Times are local, "YYYY-MM-DDTHH:MM:00" without Z. */
export interface Availability {
  id: string;
  companyId: string;
  mode: Exclude<MeetMode, "event">;
  start: string;
  end: string;
}

export const MEETING_CHANGE_REASONS = [
  "Something urgent came up",
  "I'm unwell",
  "Travel or transport problem",
  "A clash in my calendar",
] as const;
export type MeetingChangeReason = (typeof MEETING_CHANGE_REASONS)[number];

export interface Company {
  id: string;
  name: string;
  sector: string; // e.g. "Clean-tech"
  size: string; // e.g. "40 people"
  about: string;
  office?: string; // fictional visiting address for office meetings
}

/**
 * What a company can help an international hire with. Information about the JOB, shown to everyone;
 * never a filter on people. Links point to public services (Work in Finland, Business Espoo).
 */
export type InternationalSupport = "permit" | "relocation" | "onboarding-en";
export const INTERNATIONAL_SUPPORT: InternationalSupport[] = ["permit", "relocation", "onboarding-en"];
export const SUPPORT_LABEL: Record<InternationalSupport, string> = {
  permit: "Work-permit help",
  relocation: "Relocation help",
  "onboarding-en": "Onboarding in English",
};
export const WORK_IN_FINLAND_URL = "https://www.workinfinland.com/en";
export const BUSINESS_ESPOO_RECRUITMENT_URL = "https://www.businessespoo.com/";

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
  eventId?: string; // which event this problem is for; missing = defaultEvent(db)
  skills?: string[]; // 3–6 short tags of the work involved ("Work involved"); public, describes the work not the person
  support?: InternationalSupport[]; // optional: what the company can help an international hire with
  status: "draft" | "published";
  createdAt: string; // ISO
  goal?: HiringGoal; // missing on old data: use goalOf() from lib/deadlines.ts for defaults
  state?: CardState; // missing = "open". Paused/filled cards take no new answers.
  stateReason?: CardStateReason; // fixed list, chosen by a human
  stateAt?: string; // ISO, when state last changed
}

export interface Talent {
  id: string;
  displayName: string;
  email: string; // fake
  preferredLanguage?: string;
  goal?: TalentGoal; // private to the talent
  skills?: TalentSkill[]; // private to the talent: never sent to a company or organiser
  saved?: string[]; // card ids saved for later (max 50). PRIVATE: never sent to a company or organiser
}

/** A skill the talent chose to keep, phrased as work. PRIVATE. The CV it came from is never stored. */
export interface TalentSkill {
  label: string; // ≤60 chars
  source: "cv" | "self";
  addedAt: string; // ISO
}

export interface Response {
  id: string;
  publicCode: string; // "A7", unique per card
  cardId: string;
  talentId: string;
  text: string;
  originalLanguage: string; // e.g. "Ukrainian"
  aiAssisted: boolean;
  createdAt: string;
  updatedAt?: string; // set when the talent edits the answer before any shortlist
  /** The talent stepped back ("my situation changed"). The reason is NOT stored; only an optional return date, which the company may see. */
  steppedBack?: { at: string; until?: string };
}

export interface Shortlist {
  id: string;
  cardId: string;
  responseId: string;
  status: "invited" | "accepted" | "declined";
  note?: string; // private to the company
  message?: string; // optional one line from the company to the talent, shown with the invite (≤200 chars)
  createdAt?: string; // ISO
  respondBy?: string; // ISO; invite expires after this if still "invited" (see inviteStatus in lib/deadlines.ts)
}

export interface Meeting {
  id: string;
  cardId: string;
  responseId: string;
  slotStart: string; // local "YYYY-MM-DDTHH:MM:00". Event meetings: assigned by schedule. Others: picked by the talent.
  table: number; // 1-based; event meetings only (0 otherwise)
  mode?: MeetMode; // missing = "event" (older data)
  /** pending = accepted, waiting for the talent to pick a time; reschedule = the company asked for a new time. Missing = booked. */
  status?: "pending" | "booked" | "reschedule" | "cancelled";
  durationMin?: number; // 10 for event, 30 for office/video
  place?: string; // office address or (fake) video link
  /** Up to 3 of the candidate's own skill labels they chose to show on the event-day card. Private until chosen. */
  cardSkills?: string[];
  lastChange?: { by: "company" | "talent"; kind: "reschedule" | "cancel"; reason: MeetingChangeReason; at: string };
  /** After a mutual "next step": the company's promise of what happens next, and by when. */
  nextStep?: NextStepPlan;
  /** How it ended, recorded by a person (never inferred). Missing = still open. */
  outcome?: MeetingOutcome;
}

export type NextStepKind = "interview" | "trial" | "offer" | "other";
export const NEXT_STEP_KINDS: NextStepKind[] = ["interview", "trial", "offer", "other"];
export const NEXT_STEP_LABEL: Record<NextStepKind, string> = {
  interview: "Interview",
  trial: "Trial day",
  offer: "Offer",
  other: "Next step",
};
export const NEXT_STEP_NOTE_MAX = 200;
export const NEXT_STEP_MAX_DAYS = 30;

export interface NextStepPlan {
  kind: NextStepKind;
  by: string; // "YYYY-MM-DD": the date the company promised to be in touch by
  note?: string; // ≤200 chars
  plannedAt: string; // ISO
  updatedAt?: string; // ISO, set when re-planned
  /** True once the company recorded something or re-planned AFTER a promised date had passed. Feeds the company's record only. */
  missed?: boolean;
}

/** Fixed list: the company picks a reason for "not this time"; no free text is stored or sent. */
export const OUTCOME_REASONS = ["We filled it another way", "Our needs changed", "Not the right fit for this role"] as const;
export type OutcomeReason = (typeof OUTCOME_REASONS)[number];

export interface MeetingOutcome {
  kind: "hired" | "still_talking" | "not_this_time" | "talent_withdrew";
  at: string; // ISO
  reason?: OutcomeReason; // not_this_time only
}

/** draft = organiser only; open = companies publish, candidates answer; locked = no changes; done = over. */
export type EventStage = "draft" | "open" | "locked" | "done";
export const MAX_PROBLEMS_PER_EVENT = 3;

export interface Event {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  slotMinutes: number; // 10
  tables: number; // 6
  venue: string; // fictional, marked "(demo venue)"
  address?: string;
  focus?: string; // one line, e.g. "Software, games, data and robotics"
  createdAt?: string;
  stage: EventStage;
  problemDeadline: string; // "YYYY-MM-DD": last day companies can publish a problem
  description?: string; // ≤400 chars
  /** Days after the event date that people can still record outcomes. Missing = 60. */
  followUpDays?: number;
  /** Final anonymous snapshot, written when the follow-up window closes (personal data is deleted then). */
  report?: OutcomeReport;
  closedAt?: string; // ISO
}

/** Anonymous figures for one event: counts and problem titles only. Never a name, email, code or answer text. */
export interface OutcomeReport {
  asOf: string; // ISO
  funnel: {
    problems: number;
    answers: number;
    shortlisted: number;
    accepted: number;
    meetingsHeld: number;
    nextStepAgreed: number;
    nextStepPlanned: Record<NextStepKind, number>;
    hired: number;
    stillTalking: number;
    notThisTime: number;
    talentWithdrew: number;
  };
  promises: {
    medianReplyDays: number | null; // null under 5 replies
    replyKeptPct: number | null; // null under 5 counted
    nextStepKeptPct: number | null; // null under 5 counted
    overdueNow: number;
  };
  problemsWithoutNextStep: { cardId: string; title: string; companyName: string }[];
}

/** A company's place at an event. The organiser invites; the company accepts or declines. */
export interface Participation {
  id: string;
  eventId: string;
  companyId: string;
  status: "invited" | "confirmed" | "declined" | "withdrawn";
  table?: number; // set when confirmed
  invitedAt: string; // ISO
  respondedAt?: string; // ISO
  note?: string; // the organiser's message, ≤300 chars
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
  | "mutual_next_step"
  // v5
  | "reply_overdue" // system: the company's reply promise passed for an answer
  | "invite_expired" // system: an invite passed its respondBy
  | "reinvited" // company re-opened an expired invite
  | "card_paused"
  | "card_filled"
  | "card_reopened"
  | "stepped_back" // talent: my situation changed
  | "reschedule_requested" // company asked the talent to pick a new time
  | "meeting_rescheduled" // talent picked a new time
  | "meeting_cancelled"
  // v7
  | "event_invited" // organiser invited a company to an event
  | "event_joined" // company accepted
  | "event_declined" // company declined
  // v9
  | "next_step_planned" // company planned (or changed) the next step after a mutual follow-up
  | "next_step_overdue" // system: the promised next-step date passed without an outcome
  | "outcome_recorded"; // company recorded how it went, or the talent took another job

/**
 * Append-only log of what happened. Raw rows are NEVER sent to a client: use the
 * visibility helpers in lib/activity.ts, which decide what each account may see.
 */
export interface Activity {
  id: string;
  at: string; // ISO
  kind: ActivityKind;
  actor: Role | "system"; // who did it; "system" = a deadline passed
  cardId: string; // "" for event-level rows (event_*)
  companyId: string;
  responseId?: string;
  talentId?: string;
  eventId?: string; // event_* rows
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
  events: Event[];
  feedback: Feedback[];
  closures: Closure[];
  activity: Activity[];
  availability: Availability[];
  participations: Participation[];
}

/** What a company is allowed to see in the blind round. No talentId, no identity. */
export interface BlindResponse {
  id: string;
  publicCode: string;
  text: string;
  originalLanguage: string;
  aiAssisted: boolean;
  shortlist?: { status: Shortlist["status"]; note?: string; message?: string; respondBy?: string; expired?: boolean };
  closed?: { id: string; reason?: string };
  replyDue?: string; // ISO; the company's reply promise for this answer
  steppedBack?: { until?: string };
}

/** Problem card fields the AI generates from the intake. */
export type CardDraft = Pick<
  ProblemCard,
  "title" | "context" | "weekOneReality" | "hardPart" | "niceToHave" | "languages" | "languagesNeeded" | "format" | "skills" | "support"
>;

export interface IntakeAnswers {
  problem: string;
  firstWeek: string;
  hardPart: string;
  bonus: string;
  languages: string;
}

export type Role = "company" | "talent" | "organiser";
