import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, loadDB } from "@/lib/store";
import { eventById, eventOf } from "@/lib/events";
import { canPublishTo } from "@/lib/participation";
import { nowMs } from "@/lib/clock";
import { meetingMode, meetingStatus } from "@/lib/slots";

/** The company moves its problem to another upcoming event, as long as no event-day meeting is booked on it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = await loadDB();
  const card = db0.cards.find((c) => c.id === id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  if (!eventById(db0, eventId)) return NextResponse.json({ error: "Pick an event." }, { status: 400 });
  if (eventOf(db0, card).id === eventId) return NextResponse.json(card);
  const can = canPublishTo(db0, acc.companyId ?? "", eventId, nowMs());
  if (!can.ok) return NextResponse.json({ error: can.reason }, { status: 400 });
  const booked = db0.meetings.some((m) => m.cardId === id && meetingMode(m) === "event" && meetingStatus(m) === "booked");
  if (booked) return NextResponse.json({ error: "An event-day meeting is already booked for this problem, so it can't move to another event." }, { status: 409 });
  const updated = mutate((db) => {
    const c = db.cards.find((x) => x.id === id)!;
    const oldDate = eventOf(db, c).date;
    c.eventId = eventId;
    // Keep the decide-by date in step when it simply followed the old event's date.
    if (c.goal && c.goal.decideBy === oldDate) c.goal = { ...c.goal, decideBy: eventById(db, eventId)!.date };
    return c;
  });
  return NextResponse.json(updated);
}
