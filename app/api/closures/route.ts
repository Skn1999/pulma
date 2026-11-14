import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { CLOSURE_REASONS, type ClosureReason } from "@/lib/types";

export async function POST(req: Request) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.cardId !== "string" || !Array.isArray(b.responseIds) || !b.responseIds.every((x: unknown) => typeof x === "string"))
    return NextResponse.json({ error: "cardId and responseIds required" }, { status: 400 });
  let reason: ClosureReason | undefined;
  if (b.reason != null && b.reason !== "") {
    if (!(CLOSURE_REASONS as readonly string[]).includes(b.reason))
      return NextResponse.json({ error: "Unknown reason" }, { status: 400 });
    reason = b.reason as ClosureReason;
  }
  const card = getDB().cards.find((c) => c.id === b.cardId);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });

  const closed = mutate((db) => {
    let n = 0;
    for (const responseId of new Set<string>(b.responseIds)) {
      const r = db.responses.find((x) => x.id === responseId && x.cardId === card.id);
      if (!r) continue;
      if (db.shortlists.some((s) => s.responseId === r.id)) continue;
      if (db.closures.some((c) => c.responseId === r.id)) continue;
      db.closures.push({ id: newId("cl"), cardId: card.id, responseId: r.id, reason, createdAt: new Date().toISOString() });
      logActivity(db, { kind: "answer_closed", actor: "company", cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId });
      n++;
    }
    return n;
  });
  return NextResponse.json({ closed });
}
