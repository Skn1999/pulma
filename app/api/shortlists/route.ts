import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { addDays, goalOf, isOpen } from "@/lib/deadlines";
import { ANSWERS_CLOSED, eventTakesAnswers } from "@/lib/participation";
import { nowMs } from "@/lib/clock";

const MAX = 5;
const MESSAGE_MAX = 200;

export async function POST(req: Request) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.cardId !== "string" || typeof b.responseId !== "string")
    return NextResponse.json({ error: "cardId and responseId required" }, { status: 400 });
  let message: string | undefined;
  if (b.message != null) {
    if (typeof b.message !== "string") return NextResponse.json({ error: "message must be text" }, { status: 400 });
    const t = b.message.trim();
    if (t.length > MESSAGE_MAX)
      return NextResponse.json({ error: `Message must be ${MESSAGE_MAX} characters or fewer` }, { status: 400 });
    message = t || undefined;
  }
  const db = getDB();
  const card = db.cards.find((c) => c.id === b.cardId);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });
  const target = db.responses.find((r) => r.id === b.responseId && r.cardId === b.cardId);
  if (!target) return NextResponse.json({ error: "Response not found for this card" }, { status: 404 });
  if (!eventTakesAnswers(db, card, nowMs())) return NextResponse.json({ error: ANSWERS_CLOSED }, { status: 409 });
  if (!isOpen(card)) return NextResponse.json({ error: "This problem isn't taking new invites right now" }, { status: 409 });
  if (target.steppedBack) return NextResponse.json({ error: "This person has stepped back" }, { status: 409 });
  if (db.closures.some((c) => c.responseId === b.responseId))
    return NextResponse.json({ error: "Reopen this answer first" }, { status: 409 });
  if (db.shortlists.some((s) => s.responseId === b.responseId))
    return NextResponse.json({ error: "Already shortlisted" }, { status: 409 });
  if (db.shortlists.filter((s) => s.cardId === b.cardId).length >= MAX)
    return NextResponse.json({ error: `You can shortlist at most ${MAX} responses per card` }, { status: 409 });
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim() : undefined;
  const nowIso = new Date().toISOString();
  const item = mutate((d) => {
    const s = {
      id: newId("sl"),
      cardId: b.cardId as string,
      responseId: b.responseId as string,
      status: "invited" as const,
      note,
      message,
      createdAt: nowIso,
      respondBy: addDays(nowIso, goalOf(card, d).inviteDays),
    };
    d.shortlists.push(s);
    const talentId = d.responses.find((r) => r.id === s.responseId)?.talentId;
    logActivity(d, { kind: "shortlisted", actor: "company", cardId: s.cardId, companyId: card.companyId, responseId: s.responseId, talentId });
    return s;
  });
  return NextResponse.json(item, { status: 201 });
}
