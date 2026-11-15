import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { applySchedule, mutate, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { eventOf } from "@/lib/events";
import { hasBookedMeetings } from "@/lib/participation";
import { cardState } from "@/lib/deadlines";
import { WITHDRAWN_REASON } from "@/lib/types";

/**
 * The company (or the organiser) takes a company out of an event, as long as it has no booked event-day
 * meetings there. Its problems in that event are paused, and everyone who answered is told.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "talent") return NextResponse.json({ error: "Not available to candidates" }, { status: 403 });
  const { id } = await params;
  const db0 = await loadDB();
  const p0 = db0.participations.find((p) => p.id === id);
  if (!p0 || (acc.role === "company" && p0.companyId !== acc.companyId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p0.status !== "confirmed" && p0.status !== "invited") return NextResponse.json({ error: "This company is not taking part." }, { status: 409 });
  if (hasBookedMeetings(db0, p0.eventId, p0.companyId)) {
    return NextResponse.json({ error: "Event-day meetings are already booked, so this company can't leave the event now. Cancel those meetings first." }, { status: 409 });
  }
  mutate((db) => {
    const p = db.participations.find((x) => x.id === id)!;
    const at = new Date().toISOString();
    p.status = "withdrawn";
    p.respondedAt = at;
    delete p.table;
    for (const c of db.cards.filter((x) => x.companyId === p.companyId && x.status === "published" && eventOf(db, x).id === p.eventId)) {
      if (cardState(c) === "paused" && c.stateReason === WITHDRAWN_REASON) continue;
      c.state = "paused";
      c.stateReason = WITHDRAWN_REASON;
      c.stateAt = at;
      logActivity(db, { kind: "card_paused", actor: acc.role, cardId: c.id, companyId: c.companyId, at });
      for (const r of db.responses.filter((x) => x.cardId === c.id)) {
        logActivity(db, { kind: "card_paused", actor: acc.role, cardId: c.id, companyId: c.companyId, responseId: r.id, talentId: r.talentId, at });
      }
    }
    applySchedule(db);
  });
  return NextResponse.json({ ok: true });
}
