import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { applySchedule, getDB, mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";

// The talent's reason for stepping back is never asked for here, sent or stored.

async function guard(id: string) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return { err: acc };
  const r = getDB().responses.find((x) => x.id === id);
  if (!r) return { err: NextResponse.json({ error: "Answer not found" }, { status: 404 }) };
  if (r.talentId !== acc.talentId) return { err: NextResponse.json({ error: "This isn't your answer" }, { status: 403 }) };
  return { err: null };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.err) return g.err;
  const b = await req.json().catch(() => null);
  let until: string | undefined;
  if (b && b.until != null && b.until !== "") {
    const u = b.until;
    const today = new Date(Date.now()).toISOString().slice(0, 10);
    if (typeof u !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(u) || Number.isNaN(Date.parse(`${u}T00:00:00Z`)) || new Date(`${u}T00:00:00Z`).toISOString().slice(0, 10) !== u)
      return NextResponse.json({ error: "Date must look like 2026-12-01" }, { status: 400 });
    if (u <= today) return NextResponse.json({ error: "Pick a date in the future" }, { status: 400 });
    until = u;
  }
  mutate((db) => {
    const r = db.responses.find((x) => x.id === id)!;
    r.steppedBack = until ? { at: new Date().toISOString(), until } : { at: new Date().toISOString() };
    for (const s of db.shortlists) if (s.responseId === id && s.status === "invited") s.status = "declined";
    for (const m of db.meetings) {
      if (m.responseId !== id) continue;
      const st = m.status ?? "booked";
      if (st === "pending" || st === "booked" || st === "reschedule") {
        m.status = "cancelled";
        m.slotStart = "";
        m.table = 0;
      }
    }
    applySchedule(db);
    const card = db.cards.find((c) => c.id === r.cardId);
    if (card) logActivity(db, { kind: "stepped_back", actor: "talent", cardId: card.id, companyId: card.companyId, responseId: id, talentId: r.talentId });
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.err) return g.err;
  mutate((db) => {
    const r = db.responses.find((x) => x.id === id);
    if (r) delete r.steppedBack;
  });
  return NextResponse.json({ ok: true });
}
