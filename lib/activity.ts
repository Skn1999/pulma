// Activity log: one writer (call inside mutate) and viewer-specific readers.
// Raw Activity rows never leave the server. viewActivity decides what each account may see,
// and words each item so it contains no identity that viewer may not know.

import { newId } from "./store";
import type { Account, Activity, ActivityView, DB } from "./types";

export function logActivity(db: DB, a: Omit<Activity, "id" | "at"> & { at?: string }): void {
  db.activity.push({ ...a, id: newId("act"), at: a.at ?? new Date().toISOString() });
}

function slotLabel(db: DB, responseId: string | undefined): string | null {
  const m = responseId ? db.meetings.find((x) => x.responseId === responseId) : undefined;
  if (!m || !m.slotStart || !m.table) return null;
  return `Table ${m.table} · ${m.slotStart.slice(11, 16)}`;
}

export function viewActivity(db: DB, account: Account, a: Activity): ActivityView | null {
  if (account.role === "organiser") return null;
  const card = db.cards.find((c) => c.id === a.cardId);
  if (!card) return null;
  const response = a.responseId ? db.responses.find((r) => r.id === a.responseId) : undefined;
  const byMe = a.actor === account.role;
  const base = { id: a.id, at: a.at, kind: a.kind, byMe };

  if (account.role === "company") {
    if (!account.companyId || card.companyId !== account.companyId) return null;
    const cardHref = `/company/card/${card.id}`;
    if (a.kind === "card_published") {
      return { ...base, byMe: true, text: `You published "${card.title}"`, href: cardHref };
    }
    if (a.kind === "answer_withdrawn" && !response) {
      return { ...base, text: `An answer on "${card.title}" was withdrawn`, href: cardHref };
    }
    if (!response) return null;
    const code = `#${response.publicCode}`;
    const href = `${cardHref}?r=${response.id}`;
    const accepted = db.shortlists.some((s) => s.responseId === response.id && s.status === "accepted");
    const name = accepted ? db.talents.find((t) => t.id === response.talentId)?.displayName : undefined;
    const who = name ?? code; // a name only once the talent has accepted
    let text: string;
    switch (a.kind) {
      case "answer_sent":
        text = `New answer ${code} on "${card.title}"`;
        break;
      case "answer_edited":
        text = `Answer ${code} on "${card.title}" was edited`;
        break;
      case "answer_withdrawn":
        text = `Answer ${code} on "${card.title}" was withdrawn`;
        break;
      case "shortlisted":
        text = `You shortlisted ${code}`;
        break;
      case "shortlist_removed":
        text = `You removed ${code} from your shortlist`;
        break;
      case "message_updated":
        text = `You updated your message to ${code}`;
        break;
      case "invite_accepted":
        text = name ? `${code} accepted — you'll meet ${name}` : `${code} accepted your invite`;
        break;
      case "invite_declined":
        text = `${code} declined your invite`;
        break;
      case "answer_closed":
        text = `You closed ${code} with "not this time"`;
        break;
      case "answer_reopened":
        text = `You reopened ${code}`;
        break;
      case "meeting_scheduled": {
        const slot = slotLabel(db, response.id);
        text = `Meeting booked with ${who}${slot ? `: ${slot}` : ""}`;
        break;
      }
      case "mutual_next_step":
        text = `You and ${who} both want a next step`;
        break;
      default:
        return null;
    }
    return { ...base, text, href };
  }

  // talent: own responses only
  if (!account.talentId || !response || response.talentId !== account.talentId) return null;
  const company = db.companies.find((c) => c.id === a.companyId)?.name ?? "The company";
  const code = `#${response.publicCode}`;
  const href = `/talent/answers/${response.id}`;
  let text: string;
  switch (a.kind) {
    case "answer_sent":
      text = `You sent answer ${code} to ${company}`;
      break;
    case "answer_edited":
      text = `You edited answer ${code}`;
      break;
    case "shortlisted":
      text = `${company} shortlisted your answer ${code}`;
      break;
    case "message_updated":
      text = `${company} updated their message on your answer ${code}`;
      break;
    case "answer_closed": {
      const reason = db.closures.find((c) => c.responseId === response.id)?.reason;
      text = `${company}: not this time${reason ? ` — ${reason}` : ""}`;
      break;
    }
    case "answer_reopened":
      text = `${company} reopened your answer ${code}`;
      break;
    case "invite_accepted":
      text = `You accepted the invite from ${company}`;
      break;
    case "invite_declined":
      text = `You declined the invite from ${company}`;
      break;
    case "meeting_scheduled": {
      const slot = slotLabel(db, response.id);
      text = slot ? `Meeting booked: ${slot}` : `Meeting booked with ${company}`;
      break;
    }
    case "mutual_next_step":
      text = `You and ${company} both want a next step`;
      break;
    default:
      return null; // card_published, answer_withdrawn, shortlist_removed (silent) are not for talent
  }
  return { ...base, text, href };
}

export function feedFor(
  db: DB,
  account: Account,
  opts: { responseId?: string; limit?: number } = {},
): ActivityView[] {
  const rows = db.activity
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !opts.responseId || a.responseId === opts.responseId)
    .sort((x, y) => (x.a.at < y.a.at ? 1 : x.a.at > y.a.at ? -1 : y.i - x.i));
  const out: ActivityView[] = [];
  for (const { a } of rows) {
    const v = viewActivity(db, account, a);
    if (v) out.push(v);
    if (opts.limit && out.length >= opts.limit) break;
  }
  return out;
}

export function unseenCount(db: DB, account: Account): number {
  const seen = account.notificationsSeenAt;
  return feedFor(db, account).filter((v) => !v.byMe && (!seen || v.at > seen)).length;
}
