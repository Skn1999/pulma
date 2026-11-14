// What a problem means to THIS candidate right now. Pure: no I/O. Describes the candidate's own
// progress on a problem; it never scores or ranks anyone, and is never computed for a company.
import { inviteStatus, isOpen, replyStatus } from "./deadlines";
import { meetingStatus } from "./slots";
import { shortDate } from "./next-steps";
import type { DB } from "./types";

export type CandidateStatusKind = "invited" | "meeting" | "stepped_back" | "closed" | "answered" | "saved" | "new";

export interface CandidateStatus {
  kind: CandidateStatusKind;
  label: string;
  detail?: string;
}

export function candidateStatus(db: DB, talentId: string, cardId: string, now: number): CandidateStatus {
  const card = db.cards.find((c) => c.id === cardId);
  const mine = db.responses.find((r) => r.cardId === cardId && r.talentId === talentId);
  const sl = mine ? db.shortlists.find((s) => s.responseId === mine.id) : undefined;

  if (mine && sl?.status === "invited" && !inviteStatus(db, sl, now).expired) {
    return { kind: "invited", label: "Invited", detail: `Reply by ${shortDate(inviteStatus(db, sl, now).respondBy)}` };
  }
  if (mine && sl?.status === "accepted") {
    const m = db.meetings.find((x) => x.responseId === mine.id && meetingStatus(x) !== "cancelled");
    const booked = m && m.slotStart && meetingStatus(m) !== "pending";
    return { kind: "meeting", label: "Meeting booked", detail: booked ? shortDate(m.slotStart.slice(0, 10)) : "Pick a time" };
  }
  if (mine?.steppedBack) {
    const until = mine.steppedBack.until;
    return { kind: "stepped_back", label: "Stepped back", detail: until ? `until ${shortDate(until)}` : undefined };
  }
  const closed =
    !!mine && (db.closures.some((c) => c.responseId === mine.id) || sl?.status === "declined" || sl?.status === "invited");
  if (closed || (card && !isOpen(card))) return { kind: "closed", label: "Not this time" };
  if (mine) {
    const rs = replyStatus(db, mine, now);
    return { kind: "answered", label: "Answered", detail: rs.state === "overdue" ? "Company reply late" : rs.state === "due" ? `Reply expected by ${shortDate(rs.due)}` : undefined };
  }
  if (db.talents.find((t) => t.id === talentId)?.saved?.includes(cardId)) return { kind: "saved", label: "Saved" };
  return { kind: "new", label: "" };
}
