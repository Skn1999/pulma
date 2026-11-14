import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";

const MAX = 5;

export async function POST(req: Request) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.cardId !== "string" || typeof b.responseId !== "string")
    return NextResponse.json({ error: "cardId and responseId required" }, { status: 400 });
  const db = getDB();
  const card = db.cards.find((c) => c.id === b.cardId);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });
  if (!db.responses.some((r) => r.id === b.responseId && r.cardId === b.cardId))
    return NextResponse.json({ error: "Response not found for this card" }, { status: 404 });
  if (db.shortlists.some((s) => s.responseId === b.responseId))
    return NextResponse.json({ error: "Already shortlisted" }, { status: 409 });
  if (db.shortlists.filter((s) => s.cardId === b.cardId).length >= MAX)
    return NextResponse.json({ error: `You can shortlist at most ${MAX} responses per card` }, { status: 409 });
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : undefined;
  const item = mutate((d) => {
    const s = { id: newId("sl"), cardId: b.cardId as string, responseId: b.responseId as string, status: "invited" as const, note };
    d.shortlists.push(s);
    return s;
  });
  return NextResponse.json(item, { status: 201 });
}
