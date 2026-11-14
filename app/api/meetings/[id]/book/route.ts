import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { applySchedule, mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { OFF_EVENT_MINUTES, isOptionFree, meetingStatus, placeFor } from "@/lib/slots";
import { MEETING_CHANGE_REASONS, type MeetingChangeReason } from "@/lib/types";

const START = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const a = meetingAccess(acc, id, "talent");
  if (a instanceof NextResponse) return a;
  const b = await req.json().catch(() => null);
  if (!b || (b.mode !== "event" && b.mode !== "office" && b.mode !== "video")) {
    return NextResponse.json({ error: "mode must be event, office or video" }, { status: 400 });
  }
  const mode = b.mode as "event" | "office" | "video";
  const start = typeof b.start === "string" ? b.start : undefined;
  if (mode !== "event" && (!start || !START.test(start))) return NextResponse.json({ error: "start is required for this mode" }, { status: 400 });
  const status = meetingStatus(a.meeting);
  if (status === "cancelled") return NextResponse.json({ error: "This meeting was cancelled" }, { status: 409 });
  const moving = status === "booked";
  let reason: MeetingChangeReason | undefined;
  if (moving) {
    if (!(MEETING_CHANGE_REASONS as readonly string[]).includes(b.reason)) return NextResponse.json({ error: "Pick a reason for moving" }, { status: 400 });
    reason = b.reason as MeetingChangeReason;
  }
  const now = Date.now();
  if (!isOptionFree(a.db, id, mode, start, now)) return NextResponse.json({ error: "That time was just taken" }, { status: 409 });

  const out = mutate((db) => {
    const m = db.meetings.find((x) => x.id === id)!;
    const card = db.cards.find((c) => c.id === m.cardId);
    const company = db.companies.find((c) => c.id === card?.companyId);
    const resp = db.responses.find((r) => r.id === m.responseId);
    m.mode = mode;
    m.status = "booked";
    if (mode === "event") {
      m.slotStart = "";
      m.table = 0;
      m.durationMin = db.event.slotMinutes;
      delete m.place;
    } else {
      m.slotStart = start!;
      m.table = 0;
      m.durationMin = OFF_EVENT_MINUTES;
      const place = placeFor(mode, company?.office, m.id);
      if (place) m.place = place;
      else delete m.place;
    }
    if (moving) m.lastChange = { by: "talent", kind: "reschedule", reason: reason!, at: new Date().toISOString() };
    else delete m.lastChange; // a fresh pick answers any earlier "please move" request; the history stays in the activity log
    applySchedule(db);
    logActivity(db, {
      kind: moving || status === "reschedule" ? "meeting_rescheduled" : "meeting_scheduled",
      actor: "talent",
      cardId: m.cardId,
      companyId: card?.companyId ?? "",
      responseId: m.responseId,
      talentId: resp?.talentId,
    });
    return { mode, slotStart: m.slotStart || null, table: m.table || null };
  });
  return NextResponse.json(out);
}
