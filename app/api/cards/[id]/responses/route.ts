import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { buildBlindResponses } from "@/lib/blind-responses";

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.companyId !== acc.companyId) return NextResponse.json({ error: "Not your card" }, { status: 403 });

  const jar = await cookies();
  let seedVal = Number(jar.get("pulma_seed")?.value);
  const fresh = !Number.isFinite(seedVal) || !jar.get("pulma_seed");
  if (fresh) seedVal = Math.floor(Math.random() * 2 ** 31);

  const items = buildBlindResponses(db, card, Date.now());
  const rnd = mulberry32(seedVal);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const res = NextResponse.json(items);
  if (fresh) res.cookies.set("pulma_seed", String(seedVal), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 });
  return res;
}
