// Anonymous, aggregate outcomes shown to companies deciding whether to take part in an event.
// Counts only: no names, no per-person data, nothing about who answered. Pure; `now` is passed in.
import { replyStatus } from "./deadlines";
import { meetingStatus } from "./slots";
import type { DB } from "./types";

export interface Outcomes {
  problems: number; // published problems
  answers: number;
  answersPerProblem: number | null; // one decimal; null when there are no problems
  repliedOnTimePct: number | null; // share of answers that got a reply within the promise; null under MIN_COUNTED
  meetings: number; // booked conversations (all meeting kinds)
  nextSteps: number; // meetings a company followed up with "next step"
}

const MIN_COUNTED = 5;

export function platformOutcomes(db: DB, now: number): Outcomes {
  const published = new Set(db.cards.filter((c) => c.status === "published").map((c) => c.id));
  const answers = db.responses.filter((r) => published.has(r.cardId));
  let counted = 0;
  let onTime = 0;
  for (const r of answers) {
    const s = replyStatus(db, r, now);
    if (s.state === "replied") {
      counted++;
      if (s.onTime) onTime++;
    } else if (s.state === "overdue") counted++;
  }
  const meetings = db.meetings.filter((m) => published.has(m.cardId) && meetingStatus(m) === "booked").length;
  return {
    problems: published.size,
    answers: answers.length,
    answersPerProblem: published.size ? Math.round((answers.length / published.size) * 10) / 10 : null,
    repliedOnTimePct: counted >= MIN_COUNTED ? Math.round((onTime / counted) * 100) : null,
    meetings,
    nextSteps: db.feedback.filter((f) => f.side === "company" && f.outcome === "next-step").length,
  };
}

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
