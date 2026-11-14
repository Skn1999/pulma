// Match thread: one response seen from one side. Pure; privacy is decided here, never in the UI.
import { feedFor } from "./activity";
import type { Account, ActivityView, DB } from "./types";

export type ThreadStage = "sent" | "shortlisted" | "accepted" | "declined" | "closed" | "booked" | "withdrawn";
export type StepState = "done" | "current" | "todo" | "skipped";

export interface ThreadView {
  responseId: string;
  publicCode: string;
  card: { id: string; title: string; companyName: string };
  stage: ThreadStage;
  steps: { key: string; label: string; state: StepState; at?: string }[];
  privacy: { label: string; hiddenFrom: "company" | "talent"; unlocked: boolean; unlockHint: string }[];
  events: ActivityView[];
  message?: string;
  closedReason?: string;
  meeting?: { table: number; start: string };
  counterpartName?: string;
}

export function buildThread(db: DB, account: Account, responseId: string): ThreadView | null {
  if (account.role === "organiser") return null;
  const response = db.responses.find((r) => r.id === responseId);
  if (!response) return null;
  const card = db.cards.find((c) => c.id === response.cardId);
  if (!card) return null;
  const company = db.companies.find((c) => c.id === card.companyId);
  const isTalent = account.role === "talent";
  if (isTalent) {
    if (!account.talentId || response.talentId !== account.talentId) return null;
  } else if (!account.companyId || card.companyId !== account.companyId) return null;

  const sl = db.shortlists.find((s) => s.responseId === response.id);
  const closure = db.closures.find((c) => c.responseId === response.id);
  const meeting = db.meetings.find((m) => m.responseId === response.id && m.slotStart);
  const accepted = sl?.status === "accepted";
  const fb = meeting ? db.feedback.filter((f) => f.meetingId === meeting.id) : [];
  const mutual = fb.some((f) => f.side === "company" && f.outcome === "next-step") && fb.some((f) => f.side === "talent" && f.outcome === "next-step");
  const myFeedback = fb.some((f) => f.side === account.role);

  let stage: ThreadStage = "sent";
  if (sl?.status === "declined") stage = "declined";
  else if (accepted && meeting) stage = "booked";
  else if (accepted) stage = "accepted";
  else if (sl) stage = "shortlisted";
  else if (closure) stage = "closed";

  const at = (kind: string) => db.activity.filter((a) => a.responseId === response.id && a.kind === kind).map((a) => a.at).sort().pop();
  const order = ["sent", "shortlisted", "accepted", "booked", "followup"];
  const cur = stage === "sent" ? 0 : stage === "shortlisted" ? 1 : stage === "accepted" ? 2 : stage === "booked" ? (myFeedback ? 4 : 3) : -1;
  const label: Record<string, string> = { sent: "Sent", shortlisted: "Shortlisted", accepted: "Accepted", booked: "Meeting booked", followup: "Follow-up" };
  const stamp: Record<string, string | undefined> = { sent: response.createdAt, shortlisted: at("shortlisted"), accepted: at("invite_accepted"), booked: at("meeting_scheduled"), followup: at("mutual_next_step") };
  let steps: ThreadView["steps"];
  if (stage === "closed" || stage === "declined") {
    steps = [
      { key: "sent", label: label.sent, state: "done", at: stamp.sent },
      ...(stage === "declined"
        ? [
            { key: "shortlisted", label: label.shortlisted, state: "done" as StepState, at: stamp.shortlisted },
            { key: "declined", label: isTalent ? "You declined" : "Declined", state: "current" as StepState },
          ]
        : [
            { key: "shortlisted", label: label.shortlisted, state: "skipped" as StepState },
            { key: "closed", label: "Not this time", state: "current" as StepState, at: closure?.createdAt },
          ]),
    ];
  } else {
    steps = order.map((key, i) => ({
      key,
      label: label[key],
      state: (i < cur ? "done" : i === cur ? "current" : "todo") as StepState,
      ...(i <= cur && stamp[key] ? { at: stamp[key] } : {}),
    }));
    if (mutual) steps[4] = { ...steps[4], state: "done" };
  }

  const privacy: ThreadView["privacy"] = isTalent
    ? [
        { label: "Your name", hiddenFrom: "company", unlocked: accepted, unlockHint: "Shared only if you accept an invite" },
        { label: "Your email", hiddenFrom: "company", unlocked: mutual, unlockHint: "Shared only if you both choose Next step after the meeting" },
        { label: "Your other answers", hiddenFrom: "company", unlocked: false, unlockHint: "Never shown to this company" },
      ]
    : [
        { label: "Their name", hiddenFrom: "company", unlocked: accepted, unlockHint: "Unlocks when they accept your invite" },
        { label: "Their email", hiddenFrom: "company", unlocked: mutual, unlockHint: "Unlocks when you both choose Next step after the meeting" },
        { label: "Your private note", hiddenFrom: "talent", unlocked: false, unlockHint: "Never shown to them" },
      ];

  const talentName = db.talents.find((t) => t.id === response.talentId)?.displayName;
  const counterpartName = isTalent ? company?.name : accepted ? talentName : undefined;

  return {
    responseId: response.id,
    publicCode: response.publicCode,
    card: { id: card.id, title: card.title, companyName: company?.name ?? "The company" },
    stage,
    steps,
    privacy,
    events: feedFor(db, account, { responseId: response.id }).reverse(),
    ...(sl?.message ? { message: sl.message } : {}),
    ...(closure ? { closedReason: closure.reason ?? "" } : {}),
    ...(meeting ? { meeting: { table: meeting.table, start: meeting.slotStart } } : {}),
    ...(counterpartName ? { counterpartName } : {}),
  };
}
