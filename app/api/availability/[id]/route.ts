import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const w = getDB().availability.find((x) => x.id === id);
  if (!w || w.companyId !== acc.companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  mutate((db) => { db.availability = db.availability.filter((x) => x.id !== id); });
  return NextResponse.json({ ok: true });
}
