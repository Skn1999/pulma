import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";

export const MAX_SAVED = 50;

// Talent only. The saved list is private to the talent: nothing else reads it out.
export async function PUT(req: Request) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const body = (await req.json().catch(() => null)) as { cardId?: unknown; saved?: unknown } | null;
  const cardId = typeof body?.cardId === "string" ? body.cardId : "";
  if (!cardId || typeof body?.saved !== "boolean") return NextResponse.json({ error: "Missing cardId or saved" }, { status: 400 });
  if (!getDB().cards.some((c) => c.id === cardId)) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  let result: string[] = [];
  let full = false;
  mutate((db) => {
    const t = db.talents.find((x) => x.id === acc.talentId);
    if (!t) return;
    const list = (t.saved ?? []).filter((id) => id !== cardId);
    if (body.saved) {
      if (list.length >= MAX_SAVED) { full = true; result = t.saved ?? []; return; }
      list.push(cardId);
    }
    t.saved = list.length ? list : undefined;
    result = list;
  });
  if (full) return NextResponse.json({ error: `You can save up to ${MAX_SAVED} problems` }, { status: 400 });
  return NextResponse.json({ saved: result });
}
