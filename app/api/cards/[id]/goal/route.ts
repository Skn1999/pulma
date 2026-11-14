import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { goalOf } from "@/lib/deadlines";
import { parseGoal } from "@/lib/goal-input";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = getDB();
  const card = db0.cards.find((c) => c.id === id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = parseGoal(body, goalOf(card, db0));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const updated = mutate((db) => {
    const c = db.cards.find((x) => x.id === id)!;
    c.goal = parsed.goal;
    return c;
  });
  return NextResponse.json(updated);
}
