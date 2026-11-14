import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { applySchedule, mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { meetingStatus } from "@/lib/slots";
import { MEETING_CHANGE_REASONS, type MeetingChangeReason } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ error: "Not available to organisers" }, { status: 403 });
  const { id } = await params;
  const a = meetingAccess(acc, id, "company");
  if (a instanceof NextResponse) return a;
  const b = await req.json().catch(() => null);
  if (!b || !(MEETING_CHANGE_REASONS as readonly string[]).includes(b.reason)) {
    return NextResponse.json({ error: "Pick a reason" }, { status: 400 });
  }
  const reason = b.reason as MeetingChangeReason;
  const status = meetingStatus(a.meeting);
  if (status === "cancelled") return NextResponse.json({ error: "This meeting was already cancelled" }, { status: 409 });
  if (status !== "booked") return NextResponse.json({ error: "Only a booked meeting can be moved" }, { status: 409 });
  mutate((db) => {
    const m = db.meetings.find((x) => x.id === id)!;
    const card = db.cards.find((c) => c.id === m.cardId);
    const resp = db.responses.find((r) => r.id === m.responseId);
    m.status = "reschedule";
    m.slotStart = "";
    m.table = 0;
    delete m.place;
    m.lastChange = { by: a.side, kind: "reschedule", reason, at: new Date().toISOString() };
    applySchedule(db);
    logActivity(db, { kind: "reschedule_requested", actor: a.side, cardId: m.cardId, companyId: card?.companyId ?? "", responseId: m.responseId, talentId: resp?.talentId });
  });
  return NextResponse.json({ ok: true });
}
