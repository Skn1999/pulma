import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";

const MESSAGE_MAX = 200;

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
  const hasNote = typeof b?.note === "string";
  const hasMessage = b?.message !== undefined;
  if (!b || (!hasNote && !hasMessage))
    return NextResponse.json({ error: "note or message required" }, { status: 400 });

  let message: string | undefined;
  if (hasMessage && b.message !== null) {
    if (typeof b.message !== "string") return NextResponse.json({ error: "message must be text" }, { status: 400 });
    const t = b.message.trim();
    if (t.length > MESSAGE_MAX)
      return NextResponse.json({ error: `Message must be ${MESSAGE_MAX} characters or fewer` }, { status: 400 });
    message = t || undefined;
  }

  const result = mutate((db) => {
    const s = db.shortlists.find((x) => x.id === id);
    if (!s) return { kind: "missing" as const };
    if (hasMessage && s.status !== "invited") return { kind: "locked" as const };
    if (hasNote) s.note = (b.note as string).trim() || undefined;
    if (hasMessage) s.message = message;
    return {
      kind: "ok" as const,
      body: { id: s.id, status: s.status, note: s.note, message: s.message },
    };
  });
  if (result.kind === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.kind === "locked")
    return NextResponse.json(
      { error: "The message can only be changed before the person responds." },
      { status: 409 },
    );
  return NextResponse.json(result.body);
}
