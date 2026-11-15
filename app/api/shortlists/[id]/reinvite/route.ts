import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { addDays, goalOf, inviteStatus } from "@/lib/deadlines";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = await loadDB();
  const sl = db0.shortlists.find((s) => s.id === id);
  const card = sl ? db0.cards.find((c) => c.id === sl.cardId) : undefined;
  if (!sl || !card || card.companyId !== acc.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const now = Date.now();
  if (sl.status !== "invited" || !inviteStatus(db0, sl, now).expired)
    return NextResponse.json({ error: "Only an expired invite can be re-opened" }, { status: 409 });
  const respondBy = mutate((db) => {
    const s = db.shortlists.find((x) => x.id === id)!;
    s.respondBy = addDays(new Date(now).toISOString(), goalOf(card, db).inviteDays);
    const talentId = db.responses.find((r) => r.id === s.responseId)?.talentId;
    logActivity(db, { kind: "reinvited", actor: "company", cardId: card.id, companyId: card.companyId, responseId: s.responseId, talentId });
    return s.respondBy;
  });
  return NextResponse.json({ ok: true, respondBy });
}
