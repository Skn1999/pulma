// "Waiting on you" / "Waiting on them" lists for a signed-in account. Pure; privacy decided here.
// Steps come only from promises people made (reply promise, invite window, decide-by date, meetings).
// Nothing here orders or filters people; lists are sorted by deadline only.
import { cardState, goalOf, inviteStatus, decideByDays, replyStatus } from "./deadlines";
import { eventOf } from "./events";
import { localNow, meetingMode, meetingStatus } from "./slots";
import type { Account, DB, Meeting } from "./types";

export interface NextStep {
  id: string;
  text: string;
  href: string;
  due?: string; // ISO or "YYYY-MM-DD"
  overdue?: boolean;
}

export interface NextSteps {
  waitingOnYou: NextStep[];
  waitingOnThem: NextStep[];
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Helsinki" });
export const shortDate = (iso: string) => dateFmt.format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function byDeadline(a: NextStep, b: NextStep): number {
  if (!!a.overdue !== !!b.overdue) return a.overdue ? -1 : 1;
  return (a.due ?? "9999") < (b.due ?? "9999") ? -1 : (a.due ?? "9999") > (b.due ?? "9999") ? 1 : 0;
}

function meetingIsPast(db: DB, m: Meeting, now: number): boolean {
  return !!m.slotStart && meetingStatus(m) === "booked" && m.slotStart < localNow(now);
}

export function nextSteps(db: DB, account: Account, now: number): NextSteps {
  const you: NextStep[] = [];
  const them: NextStep[] = [];

  if (account.role === "company" && account.companyId) {
    const cards = db.cards.filter((c) => c.companyId === account.companyId && c.status === "published");
    const futureWindows = db.availability.filter((w) => w.companyId === account.companyId && w.end > localNow(now));
    for (const card of cards) {
      const href = `/company/card/${card.id}`;
      const goal = goalOf(card, db);
      const state = cardState(card);
      const answers = db.responses.filter((r) => r.cardId === card.id);
      const accepted = (responseId: string) =>
        db.shortlists.some((s) => s.responseId === responseId && s.status === "accepted");
      const who = (responseId: string) => {
        const r = db.responses.find((x) => x.id === responseId);
        const name = accepted(responseId) ? db.talents.find((t) => t.id === r?.talentId)?.displayName : undefined;
        return name ?? `#${r?.publicCode ?? "?"}`;
      };

      if (state === "open") {
        const waiting = answers.map((r) => ({ r, s: replyStatus(db, r, now) })).filter((x) => x.s.state === "due" || x.s.state === "overdue");
        if (waiting.length) {
          const overdue = waiting.filter((x) => x.s.state === "overdue").length;
          const due = waiting.map((x) => x.s.due).sort()[0];
          you.push({
            id: `reply-${card.id}`,
            text: overdue
              ? `Reply to ${plural(waiting.length, "answer")} on "${card.title}". ${overdue} ${overdue === 1 ? "is" : "are"} past your ${goal.replyWithinDays}-day promise.`
              : `Reply to ${plural(waiting.length, "answer")} on "${card.title}" by ${shortDate(due)}`,
            href,
            due,
            overdue: overdue > 0,
          });
        }
        const days = decideByDays(goal, now);
        if (days <= 3) {
          you.push({
            id: `decide-${card.id}`,
            text: days < 0
              ? `Your decide-by date for "${card.title}" has passed. Mark it filled, pause it, or move the date.`
              : `Decide on "${card.title}" by ${shortDate(goal.decideBy)}`,
            href,
            due: goal.decideBy,
            overdue: days < 0,
          });
        }
      }

      for (const sl of db.shortlists.filter((s) => s.cardId === card.id && s.status === "invited")) {
        const inv = inviteStatus(db, sl, now);
        const step = { href: `${href}?r=${sl.responseId}`, due: inv.respondBy };
        if (inv.expired) you.push({ id: `expired-${sl.id}`, text: `Your invite to ${who(sl.responseId)} expired on ${shortDate(inv.respondBy)}. Re-invite or remove it.`, ...step, overdue: true });
        else them.push({ id: `invite-${sl.id}`, text: `${who(sl.responseId)} has until ${shortDate(inv.respondBy)} to reply to your invite`, ...step });
      }

      for (const m of db.meetings.filter((x) => x.cardId === card.id)) {
        const st = meetingStatus(m);
        const step = { href: `${href}?r=${m.responseId}` };
        if (st === "pending" || st === "reschedule") {
          const offersOffEvent = goal.meetModes.some((md) => md !== "event");
          const ev = eventOf(db, card);
          const eventAhead = goal.meetModes.includes("event") && `${ev.date}T${ev.endTime}:00` > localNow(now);
          if (offersOffEvent && !eventAhead && futureWindows.length === 0) {
            you.push({ id: `times-${m.id}`, text: `Add meeting times so ${who(m.responseId)} can book`, href: "/company/meetings" });
          } else {
            them.push({ id: `pick-${m.id}`, text: `${who(m.responseId)} is picking ${st === "reschedule" ? "a new" : "a"} meeting time`, ...step });
          }
        } else if (meetingIsPast(db, m, now) && !db.feedback.some((f) => f.meetingId === m.id && f.side === "company")) {
          you.push({ id: `followup-${m.id}`, text: `How did your ${meetingMode(m) === "video" ? "call" : "meeting"} with ${who(m.responseId)} go?`, ...step });
        }
      }
    }
  }

  if (account.role === "talent" && account.talentId) {
    const mine = db.responses.filter((r) => r.talentId === account.talentId);
    for (const r of mine) {
      const card = db.cards.find((c) => c.id === r.cardId);
      if (!card) continue;
      const company = db.companies.find((c) => c.id === card.companyId)?.name ?? "The company";
      const href = `/talent/answers/${r.id}`;
      const sl = db.shortlists.find((s) => s.responseId === r.id);
      if (sl?.status === "invited") {
        const inv = inviteStatus(db, sl, now);
        if (!inv.expired) you.push({ id: `invite-${sl.id}`, text: `Reply to ${company}'s invite by ${shortDate(inv.respondBy)}`, href: "/talent/inbox", due: inv.respondBy });
      }
      const m = db.meetings.find((x) => x.responseId === r.id);
      if (m) {
        const st = meetingStatus(m);
        if (st === "pending") you.push({ id: `pick-${m.id}`, text: `Pick a time to meet ${company}`, href });
        else if (st === "reschedule") you.push({ id: `pick-${m.id}`, text: `${company} asked to move your meeting. Pick a new time.`, href });
        else if (meetingIsPast(db, m, now) && !db.feedback.some((f) => f.meetingId === m.id && f.side === "talent")) {
          you.push({ id: `followup-${m.id}`, text: `How did your meeting with ${company} go?`, href });
        }
      }
      if (r.steppedBack || cardState(card) !== "open") continue;
      const s = replyStatus(db, r, now);
      if (s.state === "due") them.push({ id: `reply-${r.id}`, text: `${company} promised to reply to #${r.publicCode} by ${shortDate(s.due)}`, href, due: s.due });
      if (s.state === "overdue") {
        them.push({
          id: `reply-${r.id}`,
          text: `${company} is ${plural(s.daysOver, "day")} past its reply date for #${r.publicCode}. You can keep waiting or withdraw.`,
          href,
          due: s.due,
          overdue: true,
        });
      }
    }
  }

  const sortedYou = you.sort(byDeadline);
  // Talent only, and always last: a gentle pointer to the private skills list.
  if (account.role === "talent" && !db.talents.find((t) => t.id === account.talentId)?.skills?.length) {
    sortedYou.push({ id: "add-skills", text: "Add your skills so Explore can show which problems use them", href: "/profile#skills" });
  }
  return { waitingOnYou: sortedYou, waitingOnThem: them.sort(byDeadline) };
}
