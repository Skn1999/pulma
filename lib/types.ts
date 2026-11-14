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
  languages: string[]; // e.g. ["English", "Finnish"]
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
}

export interface Shortlist {
  id: string;
  cardId: string;
  responseId: string;
  status: "invited" | "accepted" | "declined";
  note?: string; // private to the company
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

export interface DB {
  companies: Company[];
  cards: ProblemCard[];
  talents: Talent[];
  responses: Response[];
  shortlists: Shortlist[];
  meetings: Meeting[];
  event: Event;
  feedback: Feedback[];
}

/** What a company is allowed to see in the blind round. No talentId, no identity. */
export interface BlindResponse {
  id: string;
  publicCode: string;
  text: string;
  originalLanguage: string;
  translatedText?: string;
  aiAssisted: boolean;
  shortlist?: { status: Shortlist["status"]; note?: string };
}

/** Problem card fields the AI generates from the intake. */
export type CardDraft = Pick<
  ProblemCard,
  "title" | "context" | "weekOneReality" | "hardPart" | "niceToHave" | "languages" | "format"
>;

export interface IntakeAnswers {
  problem: string;
  firstWeek: string;
  hardPart: string;
  bonus: string;
  languages: string;
}

export type Role = "company" | "talent" | "organiser";
