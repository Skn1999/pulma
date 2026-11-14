import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";

function owns(companyId: string | undefined, shortlistId: string) {
  const db = getDB();
  const s = db.shortlists.find((x) => x.id === shortlistId);
  if (!s) return true; // let the handler return its own 404
  return db.cards.find((c) => c.id === s.cardId)?.companyId === companyId;
}

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  if (!owns(acc.companyId, id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const s = getDB().shortlists.find((x) => x.id === id);
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.status === "accepted") return NextResponse.json({ error: "Already accepted by the talent" }, { status: 409 });
  mutate((db) => {
    db.shortlists = db.shortlists.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  if (!owns(acc.companyId, id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b.note !== "string") return NextResponse.json({ error: "note required" }, { status: 400 });
  const found = mutate((db) => {
    const s = db.shortlists.find((x) => x.id === id);
    if (!s) return null;
    s.note = b.note.trim() || undefined;
    return { id: s.id, status: s.status, note: s.note };
  });
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(found);
}
