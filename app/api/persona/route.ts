import { NextResponse } from "next/server";
import { getDB } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const db = getDB();
  const res = NextResponse.json({ ok: true });
  const opts = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 };
  if (body.role !== undefined) {
    if (!["company", "talent", "organiser"].includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    res.cookies.set("pulma_role", body.role, opts);
  }
  if (body.companyId !== undefined) {
    if (!db.companies.some((c) => c.id === body.companyId)) return NextResponse.json({ error: "Unknown company" }, { status: 400 });
    res.cookies.set("pulma_company", body.companyId, opts);
  }
  if (body.talentId !== undefined) {
    if (!db.talents.some((t) => t.id === body.talentId)) return NextResponse.json({ error: "Unknown talent" }, { status: 400 });
    res.cookies.set("pulma_talent", body.talentId, opts);
  }
  return res;
}
