import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { eventById } from "@/lib/events";
import { eventStage, freeTable } from "@/lib/participation";
import { nowMs } from "@/lib/clock";

/** The invited company accepts (gets the lowest free table) or declines. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = await loadDB();
  const p0 = db0.participations.find((p) => p.id === id);
  if (!p0 || p0.companyId !== acc.companyId) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as { accept?: unknown } | null;
  if (typeof b?.accept !== "boolean") return NextResponse.json({ error: "accept must be true or false" }, { status: 400 });
  if (p0.status !== "invited") return NextResponse.json({ error: "This invitation has already been answered." }, { status: 409 });
  const ev = eventById(db0, p0.eventId);
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const stage = eventStage(ev, nowMs());
  if (stage === "draft") return NextResponse.json({ error: "This event isn't open yet." }, { status: 409 });
  if (stage !== "open") return NextResponse.json({ error: "This event is closed to new companies." }, { status: 409 });
  const table = b.accept ? freeTable(db0, p0.eventId) : undefined;
  if (b.accept && table === undefined) return NextResponse.json({ error: "This event is full" }, { status: 409 });
  const updated = mutate((db) => {
    const p = db.participations.find((x) => x.id === id)!;
    const at = new Date().toISOString();
    p.respondedAt = at;
    if (b.accept) {
      p.status = "confirmed";
      p.table = table;
    } else {
      p.status = "declined";
    }
    logActivity(db, { kind: b.accept ? "event_joined" : "event_declined", actor: "company", cardId: "", companyId: p.companyId, eventId: p.eventId, at });
    return p;
  });
  return NextResponse.json(updated);
}
