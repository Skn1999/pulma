import { NextResponse } from "next/server";
import { applySchedule, getDB, mutate, newId } from "@/lib/store";
import { apiAccount } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { goalOf, inviteStatus } from "@/lib/deadlines";
import { defaultEvent, eventOf } from "@/lib/events";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.accept !== "boolean") return NextResponse.json({ error: "accept (boolean) required" }, { status: 400 });
  const talentId = acc.talentId ?? "";
  const db0 = getDB();
  const sl = db0.shortlists.find((s) => s.id === id);
  if (!sl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const resp = db0.responses.find((r) => r.id === sl.responseId);
  if (!resp || resp.talentId !== talentId) return NextResponse.json({ error: "Not your invitation" }, { status: 403 });
  if (sl.status !== "invited") return NextResponse.json({ error: `Already ${sl.status}` }, { status: 409 });

  if (inviteStatus(db0, sl, Date.now()).expired) return NextResponse.json({ error: "This invite has expired" }, { status: 409 });

  const result = mutate((db) => {
    const s = db.shortlists.find((x) => x.id === id)!;
    const card = db.cards.find((c) => c.id === s.cardId);
    const ids = { cardId: s.cardId, companyId: card?.companyId ?? "", responseId: s.responseId, talentId };
    if (!b.accept) {
      s.status = "declined";
      logActivity(db, { kind: "invite_declined", actor: "talent", ...ids });
      return { status: s.status };
    }
    s.status = "accepted";
    const modes = card ? goalOf(card, db).meetModes : (["event"] as const);
    const eventOnly = modes.length === 1 && modes[0] === "event";
    if (!eventOnly) {
      // Other ways to meet are offered: the talent picks a time next.
      const pending = { id: newId("mtg"), cardId: s.cardId, responseId: s.responseId, slotStart: "", table: 0, status: "pending" as const };
      db.meetings.push(pending);
      logActivity(db, { kind: "invite_accepted", actor: "talent", ...ids });
      return { status: s.status, needsSlot: true, meetingId: pending.id };
    }
    const meeting = { id: newId("mtg"), cardId: s.cardId, responseId: s.responseId, slotStart: "", table: 0, mode: "event" as const, status: "booked" as const, durationMin: card ? eventOf(db, card).slotMinutes : defaultEvent(db).slotMinutes };
    db.meetings.push(meeting);
    logActivity(db, { kind: "invite_accepted", actor: "talent", ...ids });
    applySchedule(db);
    if (meeting.slotStart) logActivity(db, { kind: "meeting_scheduled", actor: "talent", ...ids });
    return { status: s.status, table: meeting.table || null, slotStart: meeting.slotStart || null, eventName: card ? eventOf(db, card).name : null };
  });
  return NextResponse.json(result);
}
