import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = getDB();
  const cl = db0.closures.find((c) => c.id === id);
  const card = cl && db0.cards.find((c) => c.id === cl.cardId);
  if (!cl || !card || card.companyId !== acc.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  mutate((db) => {
    db.closures = db.closures.filter((c) => c.id !== id);
    const talentId = db.responses.find((r) => r.id === cl.responseId)?.talentId;
    logActivity(db, { kind: "answer_reopened", actor: "company", cardId: card.id, companyId: card.companyId, responseId: cl.responseId, talentId });
  });
  return NextResponse.json({ ok: true });
}
