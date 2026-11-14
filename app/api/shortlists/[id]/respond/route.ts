import { NextResponse } from "next/server";
import { applySchedule, getDB, mutate, newId } from "@/lib/store";
import { getTalentId } from "@/lib/persona";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.accept !== "boolean") return NextResponse.json({ error: "accept (boolean) required" }, { status: 400 });
  const talentId = await getTalentId();
  const db0 = getDB();
  const sl = db0.shortlists.find((s) => s.id === id);
  if (!sl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const resp = db0.responses.find((r) => r.id === sl.responseId);
  if (!resp || resp.talentId !== talentId) return NextResponse.json({ error: "Not your invitation" }, { status: 403 });
  if (sl.status !== "invited") return NextResponse.json({ error: `Already ${sl.status}` }, { status: 409 });

  const result = mutate((db) => {
    const s = db.shortlists.find((x) => x.id === id)!;
    if (!b.accept) {
      s.status = "declined";
      return { status: s.status };
    }
    s.status = "accepted";
    db.meetings.push({ id: newId("mtg"), cardId: s.cardId, responseId: s.responseId, slotStart: "", table: 0 });
    applySchedule(db);
    return { status: s.status };
  });
  return NextResponse.json(result);
}
