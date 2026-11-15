import { NextResponse } from "next/server";
import { mutate, newId, nextPublicCode, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { apiAccount } from "@/lib/session";
import { isOpen } from "@/lib/deadlines";
import { ANSWERS_CLOSED, eventTakesAnswers } from "@/lib/participation";
import { nowMs } from "@/lib/clock";
import type { Response as Resp } from "@/lib/types";

export async function POST(req: Request) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const talentId = acc.talentId ?? "";
  const db = await loadDB();
  if (!db.talents.some((t) => t.id === talentId)) return NextResponse.json({ error: "Unknown talent" }, { status: 401 });
  const card = db.cards.find((c) => c.id === b.cardId && c.status === "published");
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (!eventTakesAnswers(db, card, nowMs())) return NextResponse.json({ error: ANSWERS_CLOSED }, { status: 409 });
  if (!isOpen(card)) return NextResponse.json({ error: "This problem isn't taking new answers right now" }, { status: 409 });
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "text too long" }, { status: 400 });
  if (db.responses.some((r) => r.cardId === card.id && r.talentId === talentId))
    return NextResponse.json({ error: "You have already responded to this card" }, { status: 409 });
  const created = mutate((d) => {
    const r: Resp = {
      id: newId("resp"),
      publicCode: nextPublicCode(d, card.id),
      cardId: card.id,
      talentId,
      text,
      originalLanguage: typeof b.originalLanguage === "string" && b.originalLanguage ? b.originalLanguage : "English",
      aiAssisted: b.aiAssisted === true,
      createdAt: new Date().toISOString(),
    };
    d.responses.push(r);
    logActivity(d, { kind: "answer_sent", actor: "talent", cardId: card.id, companyId: card.companyId, responseId: r.id, talentId, at: r.createdAt });
    return r;
  });
  // Talent's own response: safe to return their own id/code.
  return NextResponse.json({ id: created.id, publicCode: created.publicCode, cardId: created.cardId }, { status: 201 });
}
