import { NextResponse } from "next/server";
import { getDB, mutate } from "@/lib/store";
import { apiAccount } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const LOCKED = "The company has already shortlisted this answer, so it can't be changed.";
const CLOSED = "The company has closed this answer, so it can't be changed.";

async function guard(id: string, forEdit: boolean) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return { err: acc };
  const db = getDB();
  const r = db.responses.find((x) => x.id === id);
  if (!r) return { err: NextResponse.json({ error: "Answer not found" }, { status: 404 }) };
  if (r.talentId !== acc.talentId) return { err: NextResponse.json({ error: "This isn't your answer" }, { status: 403 }) };
  if (db.shortlists.some((s) => s.responseId === id)) return { err: NextResponse.json({ error: LOCKED }, { status: 409 }) };
  if (forEdit && db.closures.some((c) => c.responseId === id)) return { err: NextResponse.json({ error: CLOSED }, { status: 409 }) };
  return { err: null };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id, true);
  if (g.err) return g.err;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "text too long" }, { status: 400 });
  const updated = mutate((d) => {
    const r = d.responses.find((x) => x.id === id)!;
    r.text = text;
    if (typeof b.originalLanguage === "string" && b.originalLanguage) r.originalLanguage = b.originalLanguage;
    r.aiAssisted = b.aiAssisted === true;
    r.updatedAt = new Date().toISOString();
    const card = d.cards.find((c) => c.id === r.cardId);
    if (card) logActivity(d, { kind: "answer_edited", actor: "talent", cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId, at: r.updatedAt });
    return r;
  });
  return NextResponse.json({ id: updated.id, publicCode: updated.publicCode, cardId: updated.cardId });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id, false);
  if (g.err) return g.err;
  mutate((d) => {
    const r = d.responses.find((x) => x.id === id);
    if (r) {
      const card = d.cards.find((c) => c.id === r.cardId);
      if (card) logActivity(d, { kind: "answer_withdrawn", actor: "talent", cardId: card.id, companyId: card.companyId, responseId: r.id, talentId: r.talentId });
    }
    d.responses = d.responses.filter((x) => x.id !== id);
    d.closures = d.closures.filter((c) => c.responseId !== id);
  });
  return NextResponse.json({ ok: true });
}
