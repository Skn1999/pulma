// Turns passed deadlines into activity rows (once each), so both sides are told instead of left in silence.
// Call inside mutate(). Returns how many rows were added. Deadlines are promises people set; nothing is
// rejected or closed automatically — an expired invite can be re-opened by the company.
import { logActivity } from "./activity";
import { cardState, inviteStatus, replyStatus } from "./deadlines";
import { isMutual, nextStepStatus, overdueAt } from "./follow-up";
import type { DB } from "./types";

/** stamp "now" (live: so the bell fires) or "due" (seed history: dated when the deadline passed). */
export function sweepDeadlines(db: DB, now: number, stamp: "now" | "due" = "now"): number {
  const nowIso = new Date(now).toISOString();
  let added = 0;
  const logged = new Set(
    db.activity.filter((a) => a.kind === "reply_overdue" || a.kind === "invite_expired").map((a) => `${a.kind}|${a.responseId}`),
  );
  for (const r of db.responses) {
    const card = db.cards.find((c) => c.id === r.cardId);
    if (!card || cardState(card) !== "open" || logged.has(`reply_overdue|${r.id}`)) continue;
    const s = replyStatus(db, r, now);
    if (s.state !== "overdue") continue;
    logActivity(db, { kind: "reply_overdue", actor: "system", at: stamp === "due" ? s.due : nowIso, cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId });
    added++;
  }
  for (const sl of db.shortlists) {
    if (sl.status !== "invited") continue;
    const inv = inviteStatus(db, sl, now);
    // A re-invite clears the old row's effect: only log again if the latest expiry is newer than the last log.
    const last = db.activity.filter((a) => a.kind === "invite_expired" && a.responseId === sl.responseId).map((a) => a.at).sort().pop();
    if (!inv.expired || (last && last >= inv.respondBy)) continue; // `last` is ≥ respondBy for either stamp
    const card = db.cards.find((c) => c.id === sl.cardId);
    const r = db.responses.find((x) => x.id === sl.responseId);
    if (!card || !r) continue;
    logActivity(db, { kind: "invite_expired", actor: "system", at: stamp === "due" ? inv.respondBy : nowIso, cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId });
    added++;
  }
  // A promised next-step date passed without an outcome: tell both sides once per plan (a re-plan starts a new one).
  for (const m of db.meetings) {
    const plan = m.nextStep;
    if (!plan || !isMutual(db, m.id)) continue;
    const st = nextStepStatus(m, now);
    if (st.state !== "overdue") continue;
    const card = db.cards.find((c) => c.id === m.cardId);
    const r = db.responses.find((x) => x.id === m.responseId);
    if (!card || !r) continue;
    const since = plan.updatedAt ?? plan.plannedAt;
    const last = db.activity.filter((a) => a.kind === "next_step_overdue" && a.responseId === r.id).map((a) => a.at).sort().pop();
    if (last && last >= since) continue;
    logActivity(db, { kind: "next_step_overdue", actor: "system", at: stamp === "due" ? overdueAt(plan.by) : nowIso, cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId });
    added++;
  }
  return added;
}

/** Cheap check without writing: are there deadlines to log? */
export function needsSweep(db: DB, now: number): boolean {
  const copy = { ...db, activity: [...db.activity] };
  return sweepDeadlines(copy, now) > 0;
}
