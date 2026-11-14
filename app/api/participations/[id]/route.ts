import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { applySchedule, getDB, mutate } from "@/lib/store";
import { eventById } from "@/lib/events";
import { eventStage } from "@/lib/participation";
import { nowMs } from "@/lib/clock";

/** Organiser moves a confirmed company to another table. Not once the event is locked. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = getDB();
  const p0 = db0.participations.find((p) => p.id === id);
  if (!p0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ev = eventById(db0, p0.eventId);
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (p0.status !== "confirmed") return NextResponse.json({ error: "Only a confirmed company has a table." }, { status: 409 });
  const stage = eventStage(ev, nowMs());
  if (stage === "locked" || stage === "done") return NextResponse.json({ error: "Tables can't change once the event is locked." }, { status: 409 });
  const b = (await req.json().catch(() => null)) as { table?: unknown } | null;
  const table = typeof b?.table === "number" ? b.table : Number(b?.table);
  if (!Number.isInteger(table) || table < 1 || table > ev.tables) return NextResponse.json({ error: `Pick a table from 1 to ${ev.tables}.` }, { status: 400 });
  const taken = db0.participations.some((p) => p.id !== id && p.eventId === p0.eventId && p.status === "confirmed" && p.table === table);
  if (taken) return NextResponse.json({ error: "That table already belongs to another company." }, { status: 409 });
  const updated = mutate((db) => {
    const p = db.participations.find((x) => x.id === id)!;
    p.table = table;
    applySchedule(db);
    return p;
  });
  return NextResponse.json(updated);
}
