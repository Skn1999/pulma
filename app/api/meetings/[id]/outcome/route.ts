import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { nowMs } from "@/lib/clock";
import { isFinal, isMutual, isPastBy, validBy } from "@/lib/follow-up";
import { OUTCOME_REASONS, type MeetingOutcome, type OutcomeReason } from "@/lib/types";

/**
 * Record how it went. Company: hired, still_talking (new date), not_this_time (fixed reason).
 * Talent: talent_withdrew ("I've taken another job"). Choices only, no free text is stored or sent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ error: "Not available to organisers" }, { status: 403 });
  const { id } = await params;
  const a = meetingAccess(acc, id);
  if (a instanceof NextResponse) return a;
  const b = (await req.json().catch(() => null)) as { kind?: unknown; reason?: unknown; by?: unknown } | null;
  const kind = b?.kind;
  const now = nowMs();

  if (a.side === "talent") {
    if (kind !== "talent_withdrew") return NextResponse.json({ error: "You can only say you took another job" }, { status: 403 });
  } else if (kind !== "hired" && kind !== "still_talking" && kind !== "not_this_time") {
    return NextResponse.json({ error: "Pick how it went" }, { status: 400 });
  }
  let reason: OutcomeReason | undefined;
  if (kind === "not_this_time") {
    if (!(OUTCOME_REASONS as readonly unknown[]).includes(b?.reason)) return NextResponse.json({ error: "Pick a reason" }, { status: 400 });
    reason = b?.reason as OutcomeReason;
  }
  if (kind === "still_talking" && !validBy(b?.by, now)) return NextResponse.json({ error: "Pick a new date within the next 30 days" }, { status: 400 });

  return mutate((db) => {
    const m = db.meetings.find((x) => x.id === id);
    if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isMutual(db, m.id)) return NextResponse.json({ error: "This opens once you both chose Next step" }, { status: 409 });
    if (isFinal(m.outcome)) return NextResponse.json({ error: "This one is already closed" }, { status: 409 });
    if (a.side === "company" && !m.nextStep) return NextResponse.json({ error: "Plan the next step first" }, { status: 409 });
    const card = db.cards.find((c) => c.id === m.cardId);
    const resp = db.responses.find((r) => r.id === m.responseId);
    if (!card || !resp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const at = new Date(now).toISOString();
    const outcome: MeetingOutcome = { kind: kind as MeetingOutcome["kind"], at, ...(reason ? { reason } : {}) };
    if (a.side === "company" && m.nextStep) {
      if (isPastBy(m.nextStep, now)) m.nextStep.missed = true; // recorded after the promised date
      if (kind === "still_talking") {
        m.nextStep.by = b!.by as string;
        m.nextStep.updatedAt = at;
      }
    }
    m.outcome = outcome;
    logActivity(db, { kind: "outcome_recorded", actor: a.side, at, cardId: card.id, companyId: card.companyId, responseId: resp.id, talentId: resp.talentId });
    return NextResponse.json({ outcome });
  });
}
