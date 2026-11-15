import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { cardState } from "@/lib/deadlines";
import { eventOf } from "@/lib/events";
import { participationOf } from "@/lib/participation";
import { FILLED_REASONS, PAUSE_REASONS, type CardStateReason } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = await loadDB();
  const card = db0.cards.find((c) => c.id === id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const state = b?.state;
  if (state !== "open" && state !== "paused" && state !== "filled")
    return NextResponse.json({ error: "state must be open, paused or filled" }, { status: 400 });
  let reason: CardStateReason | undefined;
  if (state !== "open") {
    const allowed: readonly string[] = state === "paused" ? PAUSE_REASONS : FILLED_REASONS;
    if (typeof b.reason !== "string" || !allowed.includes(b.reason))
      return NextResponse.json({ error: "Please choose one of the listed reasons" }, { status: 400 });
    reason = b.reason as CardStateReason;
  }
  if (state === "open" && participationOf(db0, eventOf(db0, card).id, card.companyId)?.status === "withdrawn") {
    return NextResponse.json({ error: "Your company is no longer taking part in this event, so this problem can't reopen." }, { status: 409 });
  }
  if (cardState(card) === state && card.stateReason === reason) return NextResponse.json(card);
  const kind = state === "paused" ? "card_paused" : state === "filled" ? "card_filled" : "card_reopened";
  const updated = mutate((db) => {
    const c = db.cards.find((x) => x.id === id)!;
    c.state = state;
    c.stateReason = reason;
    c.stateAt = new Date().toISOString();
    logActivity(db, { kind, actor: "company", cardId: c.id, companyId: c.companyId });
    for (const r of db.responses.filter((x) => x.cardId === c.id)) {
      logActivity(db, { kind, actor: "company", cardId: c.id, companyId: c.companyId, responseId: r.id, talentId: r.talentId });
    }
    return c;
  });
  return NextResponse.json(updated);
}
